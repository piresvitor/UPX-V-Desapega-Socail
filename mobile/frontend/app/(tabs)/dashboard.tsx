import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AdminDashboardScreen() {
  const { signOut } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => (await api.get('/admin/dashboard')).data,
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#EB681E" /></View>;

  const pctVerified = data?.users?.totalActive ? (data.users.verified / data.users.totalActive) * 100 : 0;
  const pctDonated = data?.items?.total ? (data.items.donated / data.items.total) * 100 : 0;
  const pctFreights = data?.freights?.total ? (data.freights.finished / data.freights.total) * 100 : 0;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#EB681E']} />}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* HEADER PADRONIZADO */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Visão Geral</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
            <Ionicons name="log-out-outline" size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sub}>Métricas vitais da plataforma</Text>
      </View>

      <View style={styles.grid}>
        {/* Auditoria Pendente (Card de Alerta) */}
        <View style={[styles.card, data?.verifications?.pendingManualAnalysis > 0 && styles.cardAlert]}>
          <View style={styles.rowBetween}>
            <View style={styles.rowAlign}>
                <Ionicons name="alert-circle-outline" size={24} color={data?.verifications?.pendingManualAnalysis > 0 ? "#DC2626" : "#10B981"} />
                <Text style={styles.cardLabel}>Auditoria Pendente</Text>
            </View>
            <Text style={[styles.bigNumber, data?.verifications?.pendingManualAnalysis > 0 && {color: '#DC2626'}]}>
              {data?.verifications?.pendingManualAnalysis || 0}
            </Text>
          </View>
          <Text style={styles.cardDesc}>
            {data?.verifications?.pendingManualAnalysis > 0 ? 'Documentos aguardando sua revisão manual.' : 'A fila de trabalho está vazia!'}
          </Text>
        </View>

        {/* Métrica Usuários */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Usuários Ativos</Text>
            <Text style={styles.bigNumber}>{data?.users?.totalActive || 0}</Text>
          </View>
          <Text style={styles.chartLegend}>{data?.users?.verified || 0} verificados ({pctVerified.toFixed(0)}%)</Text>
          <View style={styles.chartTrack}>
            <View style={[styles.chartFill, { width: `${pctVerified}%`, backgroundColor: '#10B981' }]} />
          </View>
        </View>

        {/* Métrica Doações */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Total de Doações</Text>
            <Text style={styles.bigNumber}>{data?.items?.total || 0}</Text>
          </View>
          <Text style={styles.chartLegend}>{data?.items?.donated || 0} itens doados ({pctDonated.toFixed(0)}%)</Text>
          <View style={styles.chartTrack}>
            <View style={[styles.chartFill, { width: `${pctDonated}%`, backgroundColor: '#F59E0B' }]} />
          </View>
        </View>

        {/* Métrica Fretes */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Fretes Solicitados</Text>
            <Text style={styles.bigNumber}>{data?.freights?.total || 0}</Text>
          </View>
          <Text style={styles.chartLegend}>{data?.freights?.finished || 0} concluídos ({pctFreights.toFixed(0)}%)</Text>
          <View style={styles.chartTrack}>
            <View style={[styles.chartFill, { width: `${pctFreights}%`, backgroundColor: '#8B5CF6' }]} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { 
    paddingHorizontal: 24, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 20, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderColor: '#E2E8F0', 
    elevation: 2 
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 24, fontWeight: "bold", color: "#0F172A" },
  sub: { color: '#64748B', fontSize: 15 },
  
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoutText: { color: "#DC2626", fontWeight: "bold", fontSize: 13 },
  
  grid: { padding: 24, gap: 16 },
  
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  cardAlert: { borderWidth: 2, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowAlign: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  
  cardLabel: { fontSize: 16, color: '#334155', fontWeight: 'bold' },
  bigNumber: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  cardDesc: { fontSize: 13, color: '#64748B', marginTop: 4 },
  
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#475569' },
  chartLegend: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  chartTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  chartFill: { height: '100%', borderRadius: 4 },
});