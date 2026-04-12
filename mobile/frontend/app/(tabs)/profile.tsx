import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Image } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

interface Item { id: string; title: string; status: string; category: string; imageUrls: string[]; }
interface Review { id: string; rating: number; comment: string; createdAt: string; reviewer: { id: string; fullName: string; }; }
interface UserProfile { id: string; fullName: string; email: string; isVerified: boolean; ratingAverage: string | null; ratingCount: string | null; }

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'itens' | 'avaliacoes'>('itens');
  
  // Estados Modais
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Queries
  const { data: profile, isLoading: loadingProfile } = useQuery<UserProfile>({
    queryKey: ['users', 'me'],
    queryFn: async () => (await api.get('/users/me')).data
  });

  const { data: myItems, isLoading: loadingItems } = useQuery<Item[]>({
    queryKey: ['items', 'me'],
    queryFn: async () => (await api.get('/items/me')).data,
  });

  const { data: myReviews, isLoading: loadingReviews } = useQuery<Review[]>({
    queryKey: ['reviews', 'me', profile?.id],
    queryFn: async () => (await api.get(`/reviews/${profile?.id}`)).data,
    enabled: !!profile?.id
  });

  // Mutações
  const deactivateMutation = useMutation({
    mutationFn: async (password: string) => await api.delete('/users/me', { data: { password } }),
    onSuccess: () => {
      setDeleteModalVisible(false);
      signOut();
    },
    onError: () => Alert.alert('Erro', 'Senha inválida.')
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { fullName?: string; password?: string }) => await api.put('/users/me', data),
    onSuccess: () => {
      setEditModalVisible(false);
      setEditPassword('');
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar o perfil.')
  });

  const handleOpenEditModal = () => {
    setEditName(profile?.fullName || '');
    setEditPassword('');
    setEditModalVisible(true);
  };

  // Helper para renderizar estrelas visuais (ex: ★★★☆☆)
  const renderStars = (rating: number) => {
    const filled = '★'.repeat(rating);
    const empty = '☆'.repeat(5 - rating);
    return <Text style={styles.reviewStars}>{filled}<Text style={styles.emptyStars}>{empty}</Text></Text>;
  };

  if (loadingProfile) return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;

  return (
    <ScrollView style={styles.container} stickyHeaderIndices={[1]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{profile?.fullName.charAt(0).toUpperCase()}</Text></View>
        <Text style={styles.name}>{profile?.fullName}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        
        {profile?.isVerified && (
          <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Usuário Verificado Via IA</Text></View>
        )}

        <View style={styles.ratingBox}>
          <Text style={styles.ratingValue}>{profile?.ratingAverage ? Number(profile.ratingAverage).toFixed(1) : '0.0'}</Text>
          <Text style={styles.ratingLabel}>★ {profile?.ratingCount || 0} avaliações</Text>
        </View>
      </View>

      {/* TABS SELECTOR */}
      <View style={styles.tabsHeader}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'itens' && styles.tabBtnActive]} onPress={() => setActiveTab('itens')}>
          <Text style={[styles.tabBtnText, activeTab === 'itens' && styles.tabBtnTextActive]}>Meus Itens</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'avaliacoes' && styles.tabBtnActive]} onPress={() => setActiveTab('avaliacoes')}>
          <Text style={[styles.tabBtnText, activeTab === 'avaliacoes' && styles.tabBtnTextActive]}>Avaliações</Text>
        </TouchableOpacity>
      </View>

      {/* LISTAGENS */}
      <View style={styles.listContainer}>
        {activeTab === 'itens' ? (
          loadingItems ? <ActivityIndicator color="#2196F3" /> : (
            myItems?.length ? myItems.map(item => (
              <TouchableOpacity key={item.id} style={styles.itemCard} onPress={() => router.push(`/item/${item.id}`)}>
                {item.imageUrls?.length > 0 ? (
                  <Image source={{ uri: item.imageUrls[0] }} style={styles.itemThumb} />
                ) : (
                  <View style={styles.itemThumbPlaceholder}><Text style={{color: '#999', fontSize: 10}}>Sem foto</Text></View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={[styles.itemStatus, item.status === 'Doado' && { color: '#F44336' }, item.status === 'Reservado' && { color: '#FF9800' }]}>
                    {item.status}
                  </Text>
                </View>
              </TouchableOpacity>
            )) : <Text style={styles.emptyText}>Você ainda não postou nada.</Text>
          )
        ) : (
          loadingReviews ? <ActivityIndicator color="#2196F3" /> : (
            myReviews?.length ? myReviews.map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.reviewer.fullName}</Text>
                  {renderStars(review.rating)}
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </Text>
              </View>
            )) : <Text style={styles.emptyText}>Você ainda não recebeu avaliações.</Text>
          )
        )}
      </View>

      {/* AÇÕES E CONFIGURAÇÕES */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnEdit} onPress={handleOpenEditModal}>
          <Text style={styles.btnEditText}>Editar Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnDanger} onPress={() => { setPasswordConfirm(''); setDeleteModalVisible(true); }}>
          <Text style={styles.btnDangerText}>Desativar Conta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnLogout} onPress={() => signOut()}>
          <Text style={styles.btnLogoutText}>Sair do App</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL DE DELETAR */}
      <Modal visible={deleteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Confirmar Exclusão</Text>
                <Text style={styles.modalSubText}>Digite sua senha para desativar a conta:</Text>
                <TextInput style={styles.modalInput} placeholder="Sua senha" secureTextEntry value={passwordConfirm} onChangeText={setPasswordConfirm} />
                <View style={styles.modalRow}>
                    <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.modalBtnCancel}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => {
                        if(!passwordConfirm) return Alert.alert('Atenção', 'Senha obrigatória');
                        deactivateMutation.mutate(passwordConfirm);
                      }} 
                      style={styles.modalBtnConfirmDanger}
                    >
                      {deactivateMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmDangerText}>Confirmar</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* MODAL DE EDITAR PERFIL */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Editar Perfil</Text>
                
                <Text style={styles.inputLabel}>Nome Completo</Text>
                <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="Seu nome" />

                <Text style={styles.inputLabel}>Nova Senha (Opcional)</Text>
                <TextInput style={styles.modalInput} value={editPassword} onChangeText={setEditPassword} placeholder="Deixe em branco para não alterar" secureTextEntry />

                <View style={styles.modalRow}>
                    <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalBtnCancel}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.modalBtnConfirm}
                      disabled={updateProfileMutation.isPending}
                      onPress={() => {
                        const payload: any = {};
                        if (editName.trim() && editName !== profile?.fullName) payload.fullName = editName.trim();
                        if (editPassword.trim()) payload.password = editPassword.trim();
                        
                        if (Object.keys(payload).length > 0) {
                          updateProfileMutation.mutate(payload);
                        } else {
                          setEditModalVisible(false);
                        }
                      }} 
                    >
                      {updateProfileMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Salvar</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { alignItems: 'center', padding: 30, borderBottomWidth: 1, borderColor: '#f0f0f0', backgroundColor: '#FFF' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2196F3', justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 3 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  email: { color: '#6B7280', marginBottom: 12 },
  
  verifiedBadge: { backgroundColor: '#E0F2F1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#4DB6AC' },
  verifiedText: { color: '#00796B', fontWeight: 'bold', fontSize: 12 },
  
  ratingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9C4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  ratingValue: { fontSize: 18, fontWeight: 'bold', color: '#F57F17', marginRight: 6 },
  ratingLabel: { color: '#777', fontWeight: 'bold' },
  
  tabsHeader: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  tabBtn: { flex: 1, padding: 16, alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  tabBtnActive: { borderColor: '#2196F3' },
  tabBtnText: { color: '#9CA3AF', fontWeight: 'bold', fontSize: 15 },
  tabBtnTextActive: { color: '#2196F3' },
  
  listContainer: { padding: 20, minHeight: 200 },
  
  itemCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  itemThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#ddd' },
  itemThumbPlaceholder: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { marginLeft: 16, flex: 1 },
  itemTitle: { fontWeight: 'bold', fontSize: 16, color: '#1F2937' },
  itemStatus: { color: '#4CAF50', fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  
  reviewCard: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  reviewerName: { fontWeight: 'bold', color: '#1F2937', fontSize: 15 },
  reviewStars: { color: '#F59E0B', fontSize: 16, letterSpacing: 2 },
  emptyStars: { color: '#E5E7EB' },
  reviewComment: { color: '#4B5563', fontSize: 14, lineHeight: 20 },
  reviewDate: { color: '#9CA3AF', fontSize: 12, marginTop: 8 },
  
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 30, fontStyle: 'italic', fontSize: 15 },
  
  actions: { padding: 20, gap: 12, marginBottom: 30 },
  btnEdit: { padding: 16, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFF' },
  btnEditText: { color: '#374151', fontSize: 16, fontWeight: 'bold' },
  btnDanger: { padding: 16, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FFF' },
  btnDangerText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
  btnLogout: { padding: 16, alignItems: 'center', borderRadius: 12, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  btnLogoutText: { color: '#B91C1C', fontSize: 16, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#111827' },
  modalSubText: { marginBottom: 20, color: '#6B7280', fontSize: 15 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 6, marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#D1D5DB', padding: 14, borderRadius: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#F9FAFB' },
  
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, alignItems: 'center', marginTop: 10 },
  modalBtnCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  modalBtnConfirm: { backgroundColor: '#2196F3', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  confirmText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  modalBtnConfirmDanger: { backgroundColor: '#EF4444', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  confirmDangerText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});