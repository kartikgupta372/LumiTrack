from ..core.models import (
    CameraState,
    PerformanceState,
    Point2D,
    SimulationState,
    TrackingState,
)


from ..control.controller import PController
from ..control.pan_tilt import PanTiltController
from ..metrics.collector import MetricsCollector

class SimulationService:

    def __init__(self):
        self.state = SimulationState()
        self.controller = PController(kp=0.1)
        self.pan_tilt = PanTiltController()
        self.metrics = MetricsCollector()

    def start(self):
        self.state.running = True

    def stop(self):
        self.state.running = False

    def reset(self):
        self.state = SimulationState()

    def get_state(self) -> SimulationState:
        return self.state

    def update_state(
        self,
        beacon: Point2D | None = None,
        camera: CameraState | None = None,
        tracking: TrackingState | None = None,
        performance: PerformanceState | None = None,
    ):
        if beacon is not None:
            self.state.beacon = beacon

        if camera is not None:
            self.state.camera = camera

        if tracking is not None:
            self.state.tracking = tracking
            self.metrics.update(
                error_x=self.state.tracking.error_x,
                error_y=self.state.tracking.error_y,
                locked=self.state.tracking.locked,
            )

        if performance is not None:
            self.state.performance = performance

    

    def update_control(self):
        error_x = self.state.tracking.error_x
        error_y = self.state.tracking.error_y

        pan_velocity, tilt_velocity = self.controller.calculate(
            error_x,
            error_y
        )

        pan, tilt = self.pan_tilt.update(
            pan_velocity,
            tilt_velocity
        )

        self.state.camera.pan = pan
        self.state.camera.tilt = tilt

        return pan, tilt
    def __init__(self):
        self.state = SimulationState()

        self.controller = PController(kp=0.1)
        self.pan_tilt = PanTiltController()
        self.metrics = MetricsCollector()


simulation_service = SimulationService()