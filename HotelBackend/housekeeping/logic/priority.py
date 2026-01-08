from django.utils import timezone
from datetime import timedelta

def get_room_priority_score(room, time_now=None):
    """
    Calculates a dynamic priority score for a room based on urgency, deadlines, and type.
    Higher score represents higher dispatch priority.
    
    args:
        room: The Room object instance.
        time_now: Optional datetime for reference (default: timezone.now())
    """
    if time_now is None:
        time_now = timezone.now()

    score = 0
    
    # 1. Base Priority by Type
    if room.cleaning_type == 'PREARRIVAL':
        # Deadline Logic: As time gets closer to arrival, score increases exponentially.
        base_score = 1000
        if room.next_arrival_time:
            # Calculate hours until deadline
            delta = room.next_arrival_time - time_now
            hours_until = delta.total_seconds() / 3600.0
            
            if hours_until <= 0:
                # ALREADY LATE / GUEST WAITING
                score += 5000 
            else:
                # Formula: Boost score as we get closer (within 4 hours)
                # e.g. 1 hour left -> adds ~400
                # e.g. 4 hours left -> adds ~100
                # e.g. 24 hours left -> adds ~16
                urgency_bonus = 400.0 / max(hours_until, 0.5) 
                score += base_score + urgency_bonus
        else:
            # Fallback if no time specified, assume 2pm (14:00) default or just high priority
            score += base_score

    elif room.cleaning_type == 'DAYUSE':
        # Very high priority, guests are waiting for the room for the same day
        score += 800
        
    elif room.cleaning_type == 'DEPARTURE':
        # Standard cleaning to build inventory
        score += 300
        
    elif room.cleaning_type == 'RUBBISH':
        # Quick service, usually flexible but good to clear
        score += 200
        
    elif room.cleaning_type == 'WEEKLY':
        # Long stay, usually lowest priority unless guest requested specific time
        score += 100
        
    # 2. Modifiers
    
    # VIP Priority Flag (Manual Override)
    if room.priority:
        score += 2000
        
    # Guest Status Impact
    if room.guest_status == 'GUEST_IN_ROOM':
        # If it's a vacate clean (Departure/Prearrival), we CANNOT enter if guest is in.
        # Push to bottom.
        if room.cleaning_type in ['DEPARTURE', 'PREARRIVAL']:
            score -= 5000 # Effective Block
    
    # Status Continuity (Stickiness)
    if room.status == 'IN_PROGRESS':
        score += 50 # Slight preference to finish what's started if re-ranking
        
    return int(score)
