import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Platform } from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 
import { api } from '../../src/services/api';

export default function AdminUsersScreen() {
  const queryClient = useQueryClient();
  const router = useRouter(); 
  const [search, setSearch] = useState('');
  
  // Estado para o Modal de Confirmação (substitui o Alert)
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { 
    data, 
    isLoading, 
    refetch, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['admin', 'users', search],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get(`/admin/users?search=${search}&page=${pageParam}&limit=10`);
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage?.length === 10 ? allPages.length + 1 : undefined,
  });

  const users = data?.pages?.flat() || [];

  const banMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string, action: 'Banir' | 'Restaurar' }) => {
      await api.patch(`/admin/users/${id}/ban`, { action });
    },
    onSuccess: () => {
      setSelectedUser(null); // Fecha o modal
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => Alert.alert('Erro', 'Não foi possível alterar o status da conta.')
  });

  return (
    <View style={styles.container}>
      {/* HEADER PADRONIZADO */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestão de Usuários</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Buscar por nome ou email..." 
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#EB681E" /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          onRefresh={refetch}
          refreshing={isLoading}
          contentContainerStyle={{ padding: 24, gap: 12 }}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.5}
          renderItem={({ item }: any) => {
            const isBanned = !!item.deletedAt;
            const ratingAvg = item.ratingAverage ? Number(item.ratingAverage).toFixed(1) : '0.0';

            return (
              <View style={[styles.card, isBanned && styles.cardBanned]}>
                <TouchableOpacity 
                  style={styles.cardInfo} 
                  activeOpacity={0.7}
                  onPress={() => router.push(`/user/${item.id}`)}
                >
                  <View style={styles.nameRow}>
                    <Text style={[styles.userName, isBanned && {textDecorationLine: 'line-through', color: '#94A3B8'}]} numberOfLines={1}>
                      {item.fullName}
                    </Text>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{ratingAvg}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                  
                  <View style={styles.badges}>
                    <Text style={styles.roleBadge}>{item.role}</Text>
                    {item.isVerified && <Text style={styles.verifiedBadge}>Verificado</Text>}
                    {isBanned && <Text style={styles.bannedBadge}>BANIDO</Text>}
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, isBanned ? styles.restoreBtn : styles.banBtn]} 
                  onPress={() => setSelectedUser(item)}
                >
                  <Ionicons name={isBanned ? "refresh" : "hammer"} size={22} color={isBanned ? "#10B981" : "#DC2626"} />
                </TouchableOpacity>
              </View>
            );
          }}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator size="small" color="#EB681E" style={{ padding: 20 }} /> : null}
        />
      )}

      {/* MODAL DE CONFIRMAÇÃO (ESTILO NOVO) */}
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {selectedUser?.deletedAt ? 'Restaurar Conta' : 'Banir Usuário'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubText}>
              Tem certeza que deseja {selectedUser?.deletedAt ? 'restaurar' : 'banir'} a conta de <Text style={{fontWeight: 'bold', color: '#0F172A'}}>{selectedUser?.fullName}</Text>?
            </Text>
            
            <TouchableOpacity 
              style={[styles.modalBtn, selectedUser?.deletedAt ? styles.restoreBtnModal : styles.banBtnModal]}
              onPress={() => banMutation.mutate({ id: selectedUser.id, action: selectedUser.deletedAt ? 'Restaurar' : 'Banir' })}
            >
              {banMutation.isPending ? <ActivityIndicator color="#FFF" /> : (
                <Text style={styles.confirmText}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 15 },
  searchBox: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 14, borderRadius: 14, alignItems: 'center' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#0F172A' },
  
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, elevation: 2, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  cardBanned: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  cardInfo: { flex: 1, paddingRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', flexShrink: 1, marginRight: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ratingText: { color: '#B45309', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  userEmail: { color: '#64748B', fontSize: 13, marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 6 },
  roleBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 11, fontWeight: 'bold', color: '#475569' },
  verifiedBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 11, fontWeight: 'bold', color: '#059669' },
  bannedBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 11, fontWeight: 'bold', color: '#DC2626' },
  
  actionBtn: { padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC' },
  banBtn: { backgroundColor: '#FEF2F2' },
  restoreBtn: { backgroundColor: '#ECFDF5' },

  // Modais Modernos
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  modalSubText: { fontSize: 15, color: '#64748B', lineHeight: 22 },
  modalBtn: { paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  banBtnModal: { backgroundColor: '#DC2626' },
  restoreBtnModal: { backgroundColor: '#10B981' },
  confirmText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});