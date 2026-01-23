import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, PanResponder, PanResponderGestureState } from 'react-native';
import { ChevronsRight, ChevronsLeft, X, Play } from 'lucide-react-native';
import { theme } from '../utils/theme';

interface SwipeToStartProps {
    onSwipeRight: () => void;
    onSwipeLeft: () => void;
    rightLabel?: string;
    leftLabel?: string;
}

const BUTTON_WIDTH = 60;
const BUTTON_PADDING = 4;
const SWIPE_THRESHOLD = 0.7; // 70% of distance

export const SwipeToStart = ({ onSwipeRight, onSwipeLeft, rightLabel = "Slide to Start", leftLabel = "Swipe Left to Skip" }: SwipeToStartProps) => {
    const [containerWidth, setContainerWidth] = useState(0);
    const pan = useRef(new Animated.ValueXY()).current;

    // Limits
    const getMaxDrag = () => containerWidth - BUTTON_WIDTH - (BUTTON_PADDING * 2);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gesture) => {
                const maxDrag = getMaxDrag();
                // Allow dragging in both directions from center? 
                // No, standard UI is usually one knob. 
                // Let's make it a centered knob that can go Left (Skip) or Right (Start).

                // If we want dual action, the knob should start in the middle? 
                // Or two separate sliders?
                // Request said: "swipe para iniciar ... o posponerlo".
                // A single slider starting at Left (to Start) is standard.
                // A single slider starting at Right (to Skip) is weird.
                // Maybe a centered slider?

                // Let's Try: Starting at Left (standard) for Start.
                // For "Postpone", maybe a separate button or swipe left on the SCREEN?
                // But user asked for "swipe to start or postpone".
                // Let's do a centered slider. Knob in middle. Right = Start. Left = Postpone.

                // Logic:
                // Knob is centered.
                // Range: -MaxLeft to +MaxRight.

                // Wait, typically "Slide to Unlock" is unidirectional.
                // Single slider for "Start".
                // "Postpone" could be a swipe somewhere else or a button.
                // User said "hacer el swipe para inciar ... o posponerlo".
                // "Swipe to Start OR Postpone". 
                // I will build a Centered Slider.

                // Standard width minus knob width
                // Center is 0.

                pan.setValue({ x: gesture.dx, y: 0 });
            },
            onPanResponderRelease: (_, gesture) => {
                const maxDrag = containerWidth / 2 - BUTTON_WIDTH / 2;

                if (gesture.dx > maxDrag * SWIPE_THRESHOLD) {
                    // Swiped Right
                    onSwipeRight();
                    // Reset or hold?
                    // Usually we animate off or hold. We'll snap back for now if action fails or just wait.
                    // But if action navigates away, it doesn't matter.
                    Animated.spring(pan, { toValue: { x: maxDrag, y: 0 }, useNativeDriver: false }).start();
                } else if (gesture.dx < -maxDrag * SWIPE_THRESHOLD) {
                    // Swiped Left
                    onSwipeLeft();
                    Animated.spring(pan, { toValue: { x: -maxDrag, y: 0 }, useNativeDriver: false }).start();
                } else {
                    // Reset
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
                }
            }
        })
    ).current;

    return (
        <View
            style={styles.container}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            {/* Background Labels */}
            <View style={styles.backgroundLabels}>
                <View style={styles.bgLabelContainer}>
                    <Text style={[styles.bgText, { color: theme.colors.textSecondary }]}>{leftLabel}</Text>
                    <ChevronsLeft size={16} color={theme.colors.textSecondary} />
                </View>
                <View style={[styles.bgLabelContainer, { justifyContent: 'flex-end', flexDirection: 'row' }]}>
                    <Text style={[styles.bgText, { color: theme.colors.primary, fontWeight: 'bold' }]}>{rightLabel}</Text>
                    <ChevronsRight size={16} color={theme.colors.primary} />
                </View>
            </View>

            {/* Draggable Knob */}
            <Animated.View
                style={[
                    styles.knob,
                    {
                        transform: [{ translateX: pan.x }] // We limit via clamp in logic but visual feedback is raw for elasticity
                    }
                ]}
                {...panResponder.panHandlers}
            >
                <View style={styles.knobInner}>
                    <Play size={24} color="white" fill="white" />
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 70,
        backgroundColor: '#F3F4F6',
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        position: 'relative'
    },
    backgroundLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
        position: 'absolute'
    },
    bgLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        width: '40%',
    },
    bgText: {
        fontSize: 12,
        fontWeight: '600'
    },
    knob: {
        width: BUTTON_WIDTH,
        height: BUTTON_WIDTH,
        borderRadius: BUTTON_WIDTH / 2,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 10
    },
    knobInner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    }
});
