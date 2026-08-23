class PController:
    def __init__(self, kp: float = 0.1):
        self.kp = kp

    def calculate(self, error_x: float, error_y: float):
        pan_velocity = self.kp * error_x
        tilt_velocity = self.kp * error_y

        return pan_velocity, tilt_velocity