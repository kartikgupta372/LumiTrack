import numpy as np
from app.core.schemas import DetectionResult, TrackState, LockState


class KalmanTracker:
    """
    2D Constant-Velocity Kalman Filter for optical beacon tracking and position estimation.
    State: [x, y, vx, vy]^T
    Measurement: [x, y]^T
    """
    def __init__(self, dt: float = 1.0 / 30.0, process_noise_std: float = 2.0, measurement_noise_std: float = 3.0):
        self.dt = dt
        self.initialized = False
        self.missed_frames = 0
        self.max_prediction_horizon = 30 # frames

        # State transition matrix F
        self.F = np.array([
            [1.0, 0.0, dt,  0.0],
            [0.0, 1.0, 0.0, dt ],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0]
        ], dtype=np.float32)

        # Measurement matrix H
        self.H = np.array([
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0]
        ], dtype=np.float32)

        # Process noise covariance Q
        q = process_noise_std ** 2
        self.Q = np.eye(4, dtype=np.float32) * q

        # Measurement noise covariance R
        r = measurement_noise_std ** 2
        self.R = np.eye(2, dtype=np.float32) * r

        # State estimate x and covariance P (default to frame center 320, 240)
        self.x = np.array([[320.0], [240.0], [0.0], [0.0]], dtype=np.float32)
        self.P = np.eye(4, dtype=np.float32) * 50.0

    def reset(self, frame_width: float = 640.0, frame_height: float = 480.0):
        self.initialized = False
        self.missed_frames = 0
        cx = frame_width / 2.0
        cy = frame_height / 2.0
        self.x = np.array([[cx], [cy], [0.0], [0.0]], dtype=np.float32)
        self.P = np.eye(4, dtype=np.float32) * 50.0

    def update(self, detection: DetectionResult, lock_state: LockState) -> TrackState:
        # 1. Prediction Step: x_pred = F * x
        self.x = np.dot(self.F, self.x)
        self.P = np.dot(np.dot(self.F, self.P), self.F.T) + self.Q

        is_predicted = False

        if detection.valid and detection.x is not None and detection.y is not None:
            z = np.array([[detection.x], [detection.y]], dtype=np.float32)

            if not self.initialized:
                # Initialize state with first measurement
                self.x[0, 0] = z[0, 0]
                self.x[1, 0] = z[1, 0]
                self.x[2, 0] = 0.0
                self.x[3, 0] = 0.0
                self.initialized = True
            else:
                # 2. Correction Step (Measurement Update)
                y = z - np.dot(self.H, self.x) # Innovation
                S = np.dot(np.dot(self.H, self.P), self.H.T) + self.R # Innovation Covariance
                K = np.dot(np.dot(self.P, self.H.T), np.linalg.inv(S)) # Kalman Gain

                self.x = self.x + np.dot(K, y)
                I = np.eye(4, dtype=np.float32)
                self.P = np.dot(I - np.dot(K, self.H), self.P)

            self.missed_frames = 0
        else:
            # Measurement unavailable / target occluded -> rely on prediction
            self.missed_frames += 1
            is_predicted = True

        return TrackState(
            x=float(self.x[0, 0]),
            y=float(self.x[1, 0]),
            vx=float(self.x[2, 0]),
            vy=float(self.x[3, 0]),
            predicted=is_predicted,
            lock_state=lock_state
        )
