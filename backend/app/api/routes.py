from fastapi import APIRouter

from ..core.models import (
    CameraState,
    PerformanceState,
    Point2D,
    SimulationState,
    TrackingState,
)

from ..core.schemas import (
    SimulationConfig,
    SimulationResponse,
    SimulationStateUpdate,
)
from ..services.simulation_service import simulation_service


router = APIRouter(prefix="/simulation", tags=["Simulation"])


@router.get("/status", response_model=SimulationState)
def get_status():
    return simulation_service.get_state()


@router.post("/start", response_model=SimulationResponse)
def start_simulation():
    simulation_service.start()

    return {
        "message": "Simulation started",
        "running": True
    }


@router.post("/stop", response_model=SimulationResponse)
def stop_simulation():
    simulation_service.stop()

    return {
        "message": "Simulation stopped",
        "running": False
    }


@router.post("/reset", response_model=SimulationResponse)
def reset_simulation():
    simulation_service.reset()

    return {
        "message": "Simulation reset",
        "running": False
    }


@router.post("/config")
def configure_simulation(config: SimulationConfig):
    return {
        "message": "Configuration received",
        "config": config
    }

@router.post("/control/update")
def update_control():
    pan, tilt = simulation_service.update_control()

    return {
        "pan": pan,
        "tilt": tilt
    }


@router.put("/state")
def update_simulation_state(update: SimulationStateUpdate):
    simulation_service.update_state(
        beacon=update.beacon,
        camera=update.camera,
        tracking=update.tracking,
        performance=update.performance,
    )
    return simulation_service.get_state()

@router.get("/metrics")
def get_metrics():
    return {
        "fps": simulation_service.metrics.get_fps(),
        "average_error": simulation_service.metrics.get_average_error(),
        "maximum_error": simulation_service.metrics.get_max_error(),
        "acquisition_time": simulation_service.metrics.get_acquisition_time(),
    }
