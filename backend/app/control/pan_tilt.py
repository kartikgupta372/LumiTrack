class PanTiltController:
    def __init__(self):
        self.pan = 0.0
        self.tilt = 0.0

    def update(self, pan_velocity: float, tilt_velocity: float):
        self.pan += pan_velocity
        self.tilt += tilt_velocity

        return self.pan, self.tilt

    def reset(self):
        self.pan = 0.0
        self.tilt = 0.0