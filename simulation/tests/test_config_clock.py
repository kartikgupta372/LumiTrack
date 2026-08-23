from math import pi

import pytest

from fsoc_sim.clock import FixedStepClock
from fsoc_sim.config import BeaconRenderConfig, CameraConfig, SimulationConfig


def test_config_rejects_invalid_values() -> None:
    with pytest.raises(ValueError):
        SimulationConfig(fps=0.0)
    with pytest.raises(ValueError):
        SimulationConfig(seed=-1)
    with pytest.raises(ValueError):
        CameraConfig(horizontal_fov_rad=0.0)
    with pytest.raises(ValueError):
        CameraConfig(vertical_fov_rad=pi)
    with pytest.raises(ValueError):
        CameraConfig(initial_pan_rad=2.0, min_pan_rad=-1.0, max_pan_rad=1.0)
    with pytest.raises(ValueError):
        BeaconRenderConfig(intensity=256)


def test_fixed_step_clock_has_exact_frame_based_time() -> None:
    clock = FixedStepClock(20.0)
    ticks = [clock.tick() for _ in range(4)]
    assert [tick.frame_id for tick in ticks] == [0, 1, 2, 3]
    assert [tick.time_seconds for tick in ticks] == pytest.approx([0.0, 0.05, 0.10, 0.15])
    clock.reset()
    assert clock.tick().time_seconds == 0.0
