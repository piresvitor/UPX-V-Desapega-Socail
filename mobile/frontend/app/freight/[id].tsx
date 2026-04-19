import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

export default function FreightDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: freights, isLoading } = useQuery({
    queryKey: ['freights', 'me'],
    queryFn: async () => (await api.get('/freights/me')).data,
  });

  const freight = freights?.find((f: any) => f.id === id);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await api.patch(`/freights/${id}/status`, { status: newStatus });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['freights'] });
      
      if (variables === 'Pendente') {
        Alert.alert('Corrida Cancelada', 'O frete foi devolvido ao radar dos motoristas.');
        router.back(); // Chuta o usuário para fora da tela, pois a corrida não é mais dele
      } else {
        Alert.alert('Status Atualizado', 'A rota de entrega foi atualizada.');
      }
    },
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar o status.')
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF9800" /></View>;
  
  if (!freight) {
    return (
      <View style={styles.center}>
        <Text style={{color: '#777'}}>Frete não encontrado.</Text>
        <TouchableOpacity style={{marginTop: 20}} onPress={() => router.back()}>
          <Text style={{color: '#FF9800', fontWeight: 'bold'}}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da Corrida</Text>
      </View>

      <View style={styles.content}>
        {/* CARD DO ITEM E STATUS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.statusBadge}>{freight.status}</Text>
            <Text style={styles.priceText}>R$ {Number(freight.estimatedPrice).toFixed(2)}</Text>
          </View>
          <Text style={styles.itemTitle}>📦 {freight.item?.title}</Text>
          <Text style={styles.dateText}>Aceito em: {new Date(freight.createdAt).toLocaleDateString()}</Text>
        </View>

        {/* AÇÕES DE STATUS DA CORRIDA */}
        <Text style={styles.sectionTitle}>Atualizar Andamento</Text>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionBtn, freight.status === 'Em Trânsito' && styles.actionBtnActive]}
            disabled={freight.status === 'Em Trânsito' || freight.status === 'Finalizado'}
            onPress={() => updateStatusMutation.mutate('Em Trânsito')}
          >
            <Ionicons name="car-outline" size={24} color={freight.status === 'Em Trânsito' ? '#FFF' : '#374151'} />
            <Text style={[styles.actionBtnText, freight.status === 'Em Trânsito' && {color: '#FFF'}]}>A Caminho</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, freight.status === 'Finalizado' && styles.actionBtnActiveSuccess]}
            disabled={freight.status === 'Finalizado'}
            onPress={() => {
              Alert.alert('Finalizar', 'Confirmar entrega do item?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Confirmar', onPress: () => updateStatusMutation.mutate('Finalizado') }
              ]);
            }}
          >
            <Ionicons name="checkmark-done-circle-outline" size={24} color={freight.status === 'Finalizado' ? '#FFF' : '#374151'} />
            <Text style={[styles.actionBtnText, freight.status === 'Finalizado' && {color: '#FFF'}]}>Concluído</Text>
          </TouchableOpacity>
        </View>

        {/* BOTÃO DE CANCELAMENTO (Só aparece se o frete acabou de ser aceito) */}
        {freight.status === 'Aceito' && (
          <TouchableOpacity 
            style={styles.cancelBtn}
            onPress={() => {
              Alert.alert(
                'Devolver ao Radar', 
                'Tem certeza que deseja desistir desta corrida? Ela voltará a ficar disponível para outros motoristas parceiros.', 
                [
                  { text: 'Não', style: 'cancel' },
                  { text: 'Sim, Desistir', onPress: () => updateStatusMutation.mutate('Pendente') }
                ]
              );
            }}
          >
            <Ionicons name="close-circle-outline" size={24} color="#DC2626" />
            <Text style={styles.cancelBtnText}>Cancelar Corrida</Text>
          </TouchableOpacity>
        )}

        {/* CONTATO (CHAT) */}
        <Text style={styles.sectionTitle}>Contato</Text>
        <TouchableOpacity style={styles.chatBtn} onPress={() => router.push('/(tabs)/chat')}>
          <Ionicons name="chatbubbles" size={24} color="#FFF" />
          <Text style={styles.chatBtnText}>Abrir Inbox de Mensagens</Text>
        </TouchableOpacity>
        <Text style={styles.helpText}>As salas de negociação de frete são criadas automaticamente na sua Inbox.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { backgroundColor: '#1F2937', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },

  content: { padding: 20 },
  
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 2, marginBottom: 30 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  statusBadge: { backgroundColor: '#FFF3E0', color: '#E65100', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontWeight: 'bold', fontSize: 13 },
  priceText: { fontSize: 20, fontWeight: 'bold', color: '#10B981' },
  itemTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 10 },
  dateText: { color: '#9CA3AF', fontSize: 13 },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 15 },
  
  actionsContainer: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  actionBtn: { flex: 1, backgroundColor: '#FFF', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB' },
  actionBtnActive: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  actionBtnActiveSuccess: { backgroundColor: '#10B981', borderColor: '#10B981' },
  actionBtnText: { marginTop: 8, fontWeight: 'bold', color: '#374151' },

  cancelBtn: { flexDirection: 'row', backgroundColor: '#FEE2E2', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#FCA5A5' },
  cancelBtnText: { color: '#DC2626', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  chatBtn: { backgroundColor: '#2196F3', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  chatBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  helpText: { color: '#6B7280', fontSize: 12, textAlign: 'center', marginTop: 10 }
});