import abc
from typing import Optional, List, Tuple
import numpy as np
import cv2
from app.core.schemas import DetectionResult, DetectorType


class BaseDetector(abc.ABC):
    @abc.abstractmethod
    def detect(self, frame: np.ndarray) -> DetectionResult:
        pass


class OpenCVDetector(BaseDetector):
    """
    Classical Computer Vision Beacon Detector using OpenCV.
    Converts frame to HSV/Grayscale -> Thresholding -> Contours -> Centroid.
    """
    def __init__(self, min_area: float = 10.0, threshold_val: int = 100):
        self.min_area = min_area
        self.threshold_val = threshold_val

    def detect(self, frame: np.ndarray) -> DetectionResult:
        if frame is None or frame.size == 0:
            return DetectionResult(valid=False)

        # Convert to Grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Apply Thresholding to isolate bright optical beacon
        _, thresh = cv2.threshold(gray, self.threshold_val, 255, cv2.THRESH_BINARY)

        # Morphological opening to clean small noise specks
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

        # Find Contours
        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return DetectionResult(valid=False)

        # Find largest contour matching beacon profile
        best_cnt = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(best_cnt)

        if area < self.min_area:
            return DetectionResult(valid=False)

        # Calculate Image Moments for precise sub-pixel centroid (cx, cy)
        M = cv2.moments(best_cnt)
        if M["m00"] == 0:
            return DetectionResult(valid=False)

        cx = float(M["m10"] / M["m00"])
        cy = float(M["m01"] / M["m00"])

        # Bounding box [x, y, w, h]
        bx, by, bw, bh = cv2.boundingRect(best_cnt)
        bbox = [int(bx), int(by), int(bw), int(bh)]

        # Confidence based on peak intensity and contour circularity
        mask = np.zeros_like(gray)
        cv2.drawContours(mask, [best_cnt], -1, 255, -1)
        mean_val = float(cv2.mean(gray, mask=mask)[0])
        confidence = min(mean_val / 255.0, 1.0)

        return DetectionResult(
            valid=True,
            x=cx,
            y=cy,
            confidence=confidence,
            bbox=bbox
        )


class YOLOv8Detector(BaseDetector):
    """
    YOLOv8 AI Beacon Detector using ONNX Runtime inference.
    
    - If a model file exists at `models/beacon_yolov8.onnx`, performs full
      ONNX inference: letterbox -> normalize -> ONNX RT -> NMS -> centroid.
    - If model file is absent or ONNX Runtime is unavailable, gracefully falls
      back to OpenCVDetector automatically.
    """
    MODEL_PATH = "models/beacon_yolov8.onnx"
    INPUT_SIZE = 640
    CONF_THRESHOLD = 0.40
    IOU_THRESHOLD = 0.45

    def __init__(self):
        self.session = None
        self.input_name = None
        self.fallback = OpenCVDetector()
        self._load_model()

    def _load_model(self):
        """Attempt to load ONNX model. Silently falls back to OpenCV on failure."""
        try:
            import onnxruntime as ort
            import os
            if not os.path.exists(self.MODEL_PATH):
                print(f"[YOLOv8Detector] Model not found at '{self.MODEL_PATH}'. Using OpenCV fallback.")
                return

            opts = ort.SessionOptions()
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            self.session = ort.InferenceSession(
                self.MODEL_PATH,
                sess_options=opts,
                providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
            )
            self.input_name = self.session.get_inputs()[0].name
            print(f"[YOLOv8Detector] ONNX model loaded from '{self.MODEL_PATH}'.")
        except Exception as e:
            print(f"[YOLOv8Detector] Failed to load ONNX model ({e}). Using OpenCV fallback.")
            self.session = None

    def detect(self, frame: np.ndarray) -> DetectionResult:
        if self.session is None:
            return self.fallback.detect(frame)

        try:
            from app.vision.yolo_utils import preprocess, non_max_suppression, scale_coords, letterbox

            orig_h, orig_w = frame.shape[:2]

            # 1. Preprocess
            img_input = preprocess(frame, self.INPUT_SIZE)  # (1, 3, 640, 640)

            # 2. ONNX Inference
            outputs = self.session.run(None, {self.input_name: img_input})
            raw_preds = outputs[0]  # (1, num_anchors, 5+nc)

            # 3. NMS
            detections = non_max_suppression(
                raw_preds,
                conf_threshold=self.CONF_THRESHOLD,
                iou_threshold=self.IOU_THRESHOLD
            )

            if not detections:
                return DetectionResult(valid=False)

            # 4. Use highest-confidence detection
            best = max(detections, key=lambda d: d[4])
            x1, y1, x2, y2, conf, cls_id = best

            # 5. Rescale to original frame coords
            scale = min(self.INPUT_SIZE / orig_h, self.INPUT_SIZE / orig_w)
            pad_w = (self.INPUT_SIZE - orig_w * scale) / 2
            pad_h = (self.INPUT_SIZE - orig_h * scale) / 2

            x1 = (x1 - pad_w) / scale
            y1 = (y1 - pad_h) / scale
            x2 = (x2 - pad_w) / scale
            y2 = (y2 - pad_h) / scale

            cx = float((x1 + x2) / 2)
            cy = float((y1 + y2) / 2)
            bw = int(x2 - x1)
            bh = int(y2 - y1)

            return DetectionResult(
                valid=True,
                x=cx,
                y=cy,
                confidence=float(conf),
                bbox=[int(x1), int(y1), bw, bh]
            )

        except Exception as e:
            # On any runtime error, fall back transparently
            return self.fallback.detect(frame)


# Keep backward-compatible alias
YOLODetector = YOLOv8Detector


def get_detector(detector_type: DetectorType) -> BaseDetector:
    if detector_type == DetectorType.YOLO:
        return YOLOv8Detector()
    return OpenCVDetector()
