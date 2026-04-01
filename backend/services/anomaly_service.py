ROUND_EXPECTED_TIMES = {
    1: (20, 120),
    2: (30, 180),
    3: (45, 240),
    4: (60, 300),
    5: (90, 400),
}


def check_anomaly(time_elapsed_seconds, round_num):
    minimum, maximum = ROUND_EXPECTED_TIMES.get(round_num, (20, 300))

    if time_elapsed_seconds < minimum * 0.3:
        return {
            "suspicious": True,
            "reason": f"Submission faster than 30% of minimum expected time ({minimum}s)",
        }

    if time_elapsed_seconds > maximum * 2:
        return {
            "suspicious": False,
            "reason": "Very slow attempt but not suspicious",
        }

    return {"suspicious": False, "reason": "Within expected range"}
