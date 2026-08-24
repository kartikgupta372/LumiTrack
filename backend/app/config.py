"""
Configuration parameters and default settings for LumiTrack FSOC SIL Simulator.
"""

# World Environment Defaults
DEFAULT_WORLD_WIDTH = 1000.0  # meters
DEFAULT_WORLD_HEIGHT = 1000.0 # meters

# Camera Defaults
DEFAULT_FRAME_WIDTH = 640     # pixels
DEFAULT_FRAME_HEIGHT = 480    # pixels
DEFAULT_FOV_X = 60.0          # degrees horizontal FOV
DEFAULT_FOV_Y = 45.0          # degrees vertical FOV
DEFAULT_MAX_PAN_RATE = 90.0   # deg/s
DEFAULT_MAX_TILT_RATE = 90.0  # deg/s

# Simulation Timing
DEFAULT_FPS = 30.0
DT = 1.0 / DEFAULT_FPS

# PID Controller Defaults
DEFAULT_KP = 0.15
DEFAULT_KI = 0.01
DEFAULT_KD = 0.02

# Lock Manager Defaults
DEFAULT_LOCK_TOLERANCE_PX = 20.0 # pixels from frame center
DEFAULT_LOCK_CONSECUTIVE_FRAMES = 10
DEFAULT_LOST_TIMEOUT_FRAMES = 15

# Disturbance Defaults
DEFAULT_NOISE_PERCENT = 0.0       # 0 - 100%
DEFAULT_VIBRATION_PERCENT = 0.0   # 0 - 100%
DEFAULT_TURBULENCE_PERCENT = 0.0  # 0 - 100%
DEFAULT_BLUR_PERCENT = 0.0        # 0 - 100%
DEFAULT_OCCLUSION_ENABLED = False
