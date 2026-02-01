import React, { useState, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';

export const Stopwatch = ({ startTime }: { startTime?: string }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!startTime) return;
        const start = new Date(startTime).getTime();
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const format = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return <Text style={styles.zenTimerText}>{format(elapsed)}</Text>;
};

const styles = StyleSheet.create({
    zenTimerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        fontVariant: ['tabular-nums']
    },
});
