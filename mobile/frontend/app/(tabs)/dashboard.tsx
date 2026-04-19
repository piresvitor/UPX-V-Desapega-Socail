import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext'; // Para o botão Sair

export default function AdminDashboardScreen() {
  const { signOut } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => (await api.get('/admin/dashboard')).data,
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#111827" /></View>;

  // Cálculos para os gráficos de barra (evitando divisão por zero)
  const pctVerified = data?.users?.totalActive ? (data.users.verified / data.users.totalActive) * 100 : 0;
  const pctDonated = data?.items?.total ? (data.items.donated / data.items.total) * 100 : 0;
  const pctFreights = data?.freights?.total ? (data.freights.finished / data.freights.total) * 100 : 0;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="stats-chart" size={32} color="#2196F3" />
          <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
            <Ionicons name="log-out-outline" size={24} color="#DC2626" />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Visão Geral</Text>
        <Text style={styles.sub}>Métricas vitais da plataforma</Text>
      </View>

      <View style={styles.grid}>
        {/* Card LGPD - Fila de Trabalho */}
        <View style={[styles.cardFull, data?.verifications?.pendingManualAnalysis > 0 && styles.cardAlert]}>
          <View style={styles.rowBetween}>
            <View style={styles.rowAlign}>
              <Ionicons name="warning" size={28} color={data?.verifications?.pendingManualAnalysis > 0 ? "#DC2626" : "#10B981"} />
              <Text style={styles.cardLabelFull}>Auditoria Pendente</Text>
            </View>
            <Text style={[styles.cardNumberFull, data?.verifications?.pendingManualAnalysis > 0 && {color: '#DC2626'}]}>
              {data?.verifications?.pendingManualAnalysis || 0}
            </Text>
          </View>
          <Text style={styles.cardSubLabelFull}>
            {data?.verifications?.pendingManualAnalysis > 0 ? 'Documentos aguardando sua revisão manual.' : 'A fila de trabalho está vazia!'}
          </Text>
        </View>

        {/* Gráfico 1: Usuários */}
        <View style={styles.cardFull}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Usuários Ativos</Text>
            <Text style={styles.cardValue}>{data?.users?.totalActive || 0}</Text>
          </View>
          <Text style={styles.chartLegend}>{data?.users?.verified || 0} verificados via IA ({pctVerified.toFixed(0)}%)</Text>
          <View style={styles.chartTrack}>
            <View style={[styles.chartFill, { width: `${pctVerified}%`, backgroundColor: '#10B981' }]} />
          </View>
        </View>

        {/* Gráfico 2: Doações */}
        <View style={styles.cardFull}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Total de Doações</Text>
            <Text style={styles.cardValue}>{data?.items?.total || 0}</Text>
          </View>
          <Text style={styles.chartLegend}>{data?.items?.donated || 0} itens já doados ({pctDonated.toFixed(0)}%)</Text>
          <View style={styles.chartTrack}>
            <View style={[styles.chartFill, { width: `${pctDonated}%`, backgroundColor: '#F59E0B' }]} />
          </View>
        </View>

        {/* Gráfico 3: Fretes */}
        <View style={styles.cardFull}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Fretes Solicitados</Text>
            <Text style={styles.cardValue}>{data?.freights?.total || 0}</Text>
          </View>
          <Text style={styles.chartLegend}>{data?.freights?.finished || 0} entregas concluídas ({pctFreights.toFixed(0)}%)</Text>
          <View style={styles.chartTrack}>
            <View style={[styles.chartFill, { width: `${pctFreights}%`, backgroundColor: '#8B5CF6' }]} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { padding: 30, paddingTop: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB', elevation: 2 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoutBtn: { padding: 8, backgroundColor: '#FEE2E2', borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 15 },
  sub: { color: '#6B7280', marginTop: 5, fontSize: 15 },
  
  grid: { padding: 15 },
  
  cardFull: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2 },
  cardAlert: { borderWidth: 2, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowAlign: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardLabelFull: { fontSize: 18, color: '#374151', fontWeight: 'bold' },
  cardNumberFull: { fontSize: 28, fontWeight: 'bold', color: '#1F2937' },
  cardSubLabelFull: { fontSize: 13, color: '#6B7280', marginTop: 10 },

  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#4B5563' },
  cardValue: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  
  chartLegend: { fontSize: 13, color: '#6B7280', marginTop: 5, marginBottom: 10 },
  chartTrack: { height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden' },
  chartFill: { height: '100%', borderRadius: 6 },
});