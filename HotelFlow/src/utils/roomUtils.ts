import { Room } from '../contexts/HotelContext';

export const sortRooms = (rooms: Room[]): Room[] => {
    return [...rooms].sort((a, b) => {
        // 1. Reception Priority (Highest)
        if (a.receptionPriority && !b.receptionPriority) return -1;
        if (!a.receptionPriority && b.receptionPriority) return 1;
        if (a.receptionPriority && b.receptionPriority) return (a.receptionPriority - b.receptionPriority);

        // 2. Pre-Arrival (Urgent) + Guest Out
        const aPre = a.cleaningType === 'PREARRIVAL';
        const bPre = b.cleaningType === 'PREARRIVAL';
        const aGuestOut = a.guestStatus === 'OUT';
        const bGuestOut = b.guestStatus === 'OUT';

        if (aPre && !bPre) return -1;
        if (!aPre && bPre) return 1;

        // 3. Departure + Guest Out
        const aDep = a.cleaningType === 'DEPARTURE';
        const bDep = b.cleaningType === 'DEPARTURE';

        // Prioritize Guest OUT for Departures/Pre
        if ((aPre || aDep) && aGuestOut && !bGuestOut) return -1;
        if ((bPre || bDep) && !aGuestOut && bGuestOut) return 1;

        // 4. Standard Departure Priority
        if (aDep && !bDep) return -1;
        if (!aDep && bDep) return 1;

        return 0;
    });
};
