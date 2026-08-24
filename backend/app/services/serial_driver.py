"""
Hardware-in-the-Loop (HITL) Serial Gimbal Driver for LumiTrack.

Sends Pan/Tilt angle commands to a physical pan-tilt gimbal platform
(e.g. Arduino, Raspberry Pi, ServoController) via USB serial port.

If no hardware is detected or PySerial fails, falls back to VirtualSerial
which simply logs commands to console.

Protocol: ASCII frame "$PAN:9.74,TILT:4.94\\n" at up to 30 Hz.
"""

import time
import threading
from typing import Optional, List


class VirtualSerial:
    """
    Simulated serial port that logs angle commands to stdout.
    Used when no physical gimbal hardware is present.
    """
    def __init__(self, port: str = "VIRTUAL"):
        self.port = port
        self.is_open = True
        print(f"[SerialDriver] VirtualSerial started on port: {port}")

    def write(self, data: bytes):
        print(f"[SerialDriver] TX → {data.decode('utf-8').strip()}")

    def close(self):
        self.is_open = False
        print("[SerialDriver] VirtualSerial closed.")


class SerialGimbalDriver:
    """
    Real/Virtual serial gimbal driver.

    Usage:
        driver = SerialGimbalDriver(port="COM3", baud_rate=115200)
        driver.connect()
        driver.send(pan_deg=9.74, tilt_deg=4.94)
        driver.disconnect()
    """
    def __init__(self, port: Optional[str] = None, baud_rate: int = 115200):
        self.port = port
        self.baud_rate = baud_rate
        self._serial = None
        self._lock = threading.Lock()
        self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected

    def list_ports(self) -> List[str]:
        """Return list of available COM ports."""
        try:
            import serial.tools.list_ports
            ports = [p.device for p in serial.tools.list_ports.comports()]
            return ports
        except Exception:
            return []

    def connect(self, port: Optional[str] = None) -> bool:
        """
        Connect to a serial port. Auto-selects first available port if none given.
        Falls back to VirtualSerial if no hardware found.
        """
        if port:
            self.port = port

        try:
            import serial

            # Auto-detect port if not specified
            if not self.port:
                available = self.list_ports()
                if available:
                    self.port = available[0]
                    print(f"[SerialDriver] Auto-detected port: {self.port}")
                else:
                    raise serial.SerialException("No serial ports available.")

            self._serial = serial.Serial(
                port=self.port,
                baudrate=self.baud_rate,
                timeout=0.1
            )
            self._connected = True
            print(f"[SerialDriver] Connected to real hardware at {self.port} @ {self.baud_rate} baud.")
            return True

        except Exception as e:
            print(f"[SerialDriver] Hardware connection failed ({e}). Switching to VirtualSerial.")
            self._serial = VirtualSerial(port=self.port or "VIRTUAL")
            self._connected = True
            return False

    def disconnect(self):
        if self._serial:
            self._serial.close()
        self._connected = False
        self._serial = None
        print("[SerialDriver] Disconnected.")

    def send(self, pan_deg: float, tilt_deg: float):
        """
        Transmit Pan/Tilt angle command frame over serial.
        Format: "$PAN:<val>,TILT:<val>\\n"
        """
        if not self._connected or self._serial is None:
            return

        cmd = f"$PAN:{pan_deg:.3f},TILT:{tilt_deg:.3f}\n"
        with self._lock:
            try:
                self._serial.write(cmd.encode("utf-8"))
            except Exception as e:
                print(f"[SerialDriver] Write error: {e}")
