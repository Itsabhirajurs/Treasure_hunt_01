import math


def calculate_score(base=1000, time_elapsed_sec=0, hints_used=0, round_number=1):
    """
    Exponential decay scoring inspired by ML learning rate decay.
    Lambda decay constant: 0.002 (slow decay, rewards speed but not punishingly)
    """
    time_decay = math.exp(-0.002 * max(0, time_elapsed_sec))
    hint_penalty = max(0.1, 1 - (0.20 * max(0, hints_used)))
    round_multiplier = 1 + (max(1, round_number) - 1) * 0.3
    raw_score = base * time_decay * hint_penalty * round_multiplier
    return max(10, round(raw_score))
