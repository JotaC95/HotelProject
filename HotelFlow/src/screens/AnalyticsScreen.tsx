import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { useHotel } from '../contexts/HotelContext';
import { BedDouble, CheckCircle, AlertCircle, Search } from 'lucide-react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { theme } from '../utils/theme';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0,
};

export const AnalyticsScreen = () => {
    const { fetchAnalytics } = useHotel();
    const [stats, setStats] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        const data = await fetchAnalytics();
        setStats(data);
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    if (!stats) return <View style={styles.container}><Text>Loading...</Text></View>;

    // Prepare Pie Chart Data (Room Status)
    const pieData = Object.keys(stats.statusDistribution || {}).map((status, index) => {
        const colors = ['#FFC107', '#2196F3', '#9C27B0', '#4CAF50', '#F44336']; // Pending, InProg, Insp, Comp, Maint
        return {
            name: status.replace('_', ' '),
            population: stats.statusDistribution[status],
            color: colors[index % colors.length],
            legendFontColor: "#7F7F7F",
            legendFontSize: 12
        };
    }).filter(d => d.population > 0);

    // Prepare Bar Chart Data (Incidents by Role)
    const incidentLabels = Object.keys(stats.incidentDistribution || {});
    const incidentValues = incidentLabels.map(k => stats.incidentDistribution[k]);

    const barData = {
        labels: incidentLabels.map(l => l.substring(0, 4)), // Abbreviate
        datasets: [{ data: incidentValues }]
    };

    // Prepare Line Chart Data (Weekly Activity)
    const lineData = {
        labels: stats.weeklyActivity?.labels || [],
        datasets: [{ data: stats.weeklyActivity?.data || [0] }]
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <Text style={styles.header}>Dashboard Analytics</Text>

            {/* KPI Cards */}
            <View style={styles.grid}>
                <View style={[styles.card, styles.blueCard]}>
                    <Text style={styles.cardTitle}>Total Rooms</Text>
                    <Text style={styles.cardValue}>{stats.totalRooms}</Text>
                    <BedDouble size={24} color="#FFF" style={styles.icon} />
                </View>

                <View style={[styles.card, styles.greenCard]}>
                    <Text style={styles.cardTitle}>Cleaned Today</Text>
                    <Text style={styles.cardValue}>{stats.cleanedToday}</Text>
                    <CheckCircle size={24} color="#FFF" style={styles.icon} />
                </View>

                <View style={[styles.card, styles.redCard]}>
                    <Text style={styles.cardTitle}>Open Issues</Text>
                    <Text style={styles.cardValue}>{stats.issuesOpen}</Text>
                    <AlertCircle size={24} color="#FFF" style={styles.icon} />
                </View>

                <View style={[styles.card, styles.orangeCard]}>
                    <Text style={styles.cardTitle}>Lost Items</Text>
                    <Text style={styles.cardValue}>{stats.lostItemsFound}</Text>
                    <Search size={24} color="#FFF" style={styles.icon} />
                </View>
            </View>

            {/* Charts */}
            <Text style={styles.sectionTitle}>Room Status Distribution</Text>
            <View style={styles.chartContainer}>
                {pieData.length > 0 ? (
                    <PieChart
                        data={pieData}
                        width={screenWidth - 60}
                        height={200}
                        chartConfig={chartConfig}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                    />
                ) : <Text>No Data</Text>}
            </View>

            <Text style={styles.sectionTitle}>Open Incidents by Role</Text>
            <View style={styles.chartContainer}>
                <BarChart
                    data={barData}
                    width={screenWidth - 60}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    verticalLabelRotation={0}
                    fromZero
                />
            </View>

            <Text style={styles.sectionTitle}>Weekly Activity (Simulated)</Text>
            <View style={styles.chartContainer}>
                <LineChart
                    data={lineData}
                    width={screenWidth - 60}
                    height={220}
                    chartConfig={{
                        ...chartConfig,
                        backgroundColor: "#e26a00",
                        backgroundGradientFrom: "#fb8c00",
                        backgroundGradientTo: "#ffa726",
                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                />
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
    card: { width: '48%', padding: 20, borderRadius: 12, position: 'relative', height: 120, justifyContent: 'center' },
    blueCard: { backgroundColor: '#2196F3' },
    greenCard: { backgroundColor: '#4CAF50' },
    redCard: { backgroundColor: '#F44336' },
    orangeCard: { backgroundColor: '#FF9800' },
    cardTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
    cardValue: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginTop: 5 },
    icon: { position: 'absolute', top: 10, right: 10, opacity: 0.5 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, marginTop: 10, color: '#333' },
    chartContainer: { backgroundColor: '#FFF', padding: 10, borderRadius: 12, alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
});
