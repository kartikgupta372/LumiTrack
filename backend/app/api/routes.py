"""REST API for the unified LumiTrack simulation frontend."""

from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.schemas import PerformanceMetrics, ScenarioConfig, TrajectoryType
from app.services.engine import SimulationEngine
from app.services.report_generator import ReportGenerator
from app.services.serial_driver import SerialGimbalDriver


router = APIRouter()
serial_driver = SerialGimbalDriver()
sim_engine = SimulationEngine(serial_driver=serial_driver)
report_gen = ReportGenerator(output_dir="reports")


PREDEFINED_SCENARIOS = {
    "nominal": ScenarioConfig(
        id="nominal",
        name="Nominal Circular Tracking",
        target={"trajectory": TrajectoryType.CIRCULAR, "speed": 6.0, "radius": 20.0},
        disturbances={"noise": 0.0, "vibration": 0.0, "turbulence": 0.0},
    ),
    "noisy_environment": ScenarioConfig(
        id="noisy_environment",
        name="High Sensor Noise (30%)",
        target={"trajectory": TrajectoryType.CIRCULAR, "speed": 6.0, "radius": 20.0},
        disturbances={"noise": 30.0, "vibration": 5.0, "turbulence": 10.0},
    ),
    "severe_vibration": ScenarioConfig(
        id="severe_vibration",
        name="Severe Platform Jitter (40%)",
        target={"trajectory": TrajectoryType.SINUSOIDAL, "speed": 8.0, "radius": 15.0},
        disturbances={"noise": 10.0, "vibration": 40.0, "turbulence": 15.0},
    ),
    "occlusion_test": ScenarioConfig(
        id="occlusion_test",
        name="Target Occlusion & Loss Test",
        target={"trajectory": TrajectoryType.LINEAR, "speed": 10.0},
        disturbances={"noise": 10.0, "occlusion": True, "occlusion_duration_s": 2.5},
    ),
    "erratic_target": ScenarioConfig(
        id="erratic_target",
        name="Erratic Random Waypoint Motion",
        target={"trajectory": TrajectoryType.ERRATIC, "speed": 12.0},
        disturbances={"noise": 15.0, "vibration": 15.0, "turbulence": 20.0},
    ),
}


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "app": "LumiTrack FSOC SIL Simulator",
        "running": sim_engine.running,
        "paused": sim_engine.paused,
        "serial_connected": serial_driver.is_connected,
    }


@router.get("/scenarios", response_model=List[ScenarioConfig])
def list_scenarios():
    return list(PREDEFINED_SCENARIOS.values())


@router.get("/simulation/status")
def simulation_status():
    return {
        "running": sim_engine.running,
        "paused": sim_engine.paused,
        "config": sim_engine.config,
    }


@router.post("/simulation/start")
def start_simulation():
    sim_engine.start()
    return {"message": "Simulation started", "running": True, "paused": False}


@router.post("/simulation/pause")
def pause_simulation():
    sim_engine.pause()
    return {"message": "Simulation paused", "running": sim_engine.running, "paused": True}


@router.post("/simulation/resume")
def resume_simulation():
    sim_engine.resume()
    return {"message": "Simulation resumed", "running": sim_engine.running, "paused": False}


@router.post("/simulation/reset")
def reset_simulation():
    sim_engine.reset()
    return {"message": "Simulation reset", "running": sim_engine.running, "paused": sim_engine.paused}


@router.post("/simulation/stop")
def stop_simulation():
    sim_engine.stop()
    return {"message": "Simulation stopped", "running": False, "paused": False}


@router.post("/simulation/config")
def update_config(config: ScenarioConfig):
    sim_engine.reconfigure(config)
    return {"message": "Configuration updated", "config": sim_engine.config}


@router.get("/metrics/current", response_model=PerformanceMetrics)
def get_current_metrics():
    return sim_engine.evaluator.get_metrics()


@router.get("/serial/ports")
def list_serial_ports():
    ports = serial_driver.list_ports()
    return {"ports": ports, "count": len(ports)}


@router.post("/serial/connect")
def connect_serial(port: Optional[str] = None):
    hardware = serial_driver.connect(port=port)
    return {
        "connected": serial_driver.is_connected,
        "port": serial_driver.port,
        "hardware": hardware,
        "message": "Connected to hardware" if hardware else "Using virtual serial",
    }


@router.post("/serial/disconnect")
def disconnect_serial():
    serial_driver.disconnect()
    return {"connected": False, "message": "Serial driver disconnected"}


@router.get("/serial/status")
def serial_status():
    return {
        "connected": serial_driver.is_connected,
        "port": serial_driver.port,
        "baud_rate": serial_driver.baud_rate,
    }


@router.post("/reports/record_frame")
def record_telemetry_frame(error_px: float, pan_deg: float, tilt_deg: float, timestamp: float):
    return {"recorded": True}


@router.post("/reports/generate")
def generate_pdf_report():
    metrics = sim_engine.evaluator.get_metrics().model_dump()
    history = sim_engine.telemetry_history
    try:
        filepath = report_gen.generate(
            scenario_name=sim_engine.config.name,
            metrics=metrics,
            error_history=history["errors_px"] or None,
            pan_history=history["pan_angles"] or None,
            tilt_history=history["tilt_angles"] or None,
            timestamps=history["timestamps"] or None,
        )
        return FileResponse(
            path=filepath,
            media_type="application/pdf",
            filename=Path(filepath).name,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}") from exc
