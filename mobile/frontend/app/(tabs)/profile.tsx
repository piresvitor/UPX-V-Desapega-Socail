import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ProfileScreen() {
  const { signOut, userRole } = useAuth(); 
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'itens' | 'avaliacoes' | 'fretes'>(userRole === 'Freteiro' ? 'fretes' : 'itens');
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // 1. Dados Principais do Perfil
  const { data: profile, isLoading: loadingProfile, refetch: refetchProfile } = useQuery<any>({
    queryKey: ['users', 'me'],
    queryFn: async () => (await api.get('/users/me')).data
  });

  // 2. Itens do Doador/Beneficiário
  const { data: myItems, isLoading: loadingItems, refetch: refetchItems } = useQuery<any>({
    queryKey: ['items', 'me'],
    queryFn: async () => (await api.get('/items/me')).data,
    enabled: userRole !== 'Freteiro'
  });

  // 3. Avaliações
  const { data: myReviews, isLoading: loadingReviews, refetch: refetchReviews } = useQuery<any>({
    queryKey: ['reviews', 'me', profile?.id],
    queryFn: async () => (await api.get(`/reviews/${profile?.id}`)).data,
    enabled: !!profile?.id
  });

  // 4. Fretes (Apenas Freteiros)
  const { data: myFreights, isLoading: loadingFreights, refetch: refetchFreights } = useQuery<any>({
    queryKey: ['freights', 'me'],
    queryFn: async () => (await api.get('/freights/me')).data,
    enabled: userRole === 'Freteiro' 
  });

  // 5. Status da IA
  const { data: verificationStatus, refetch: refetchVerification } = useQuery({
    queryKey: ['verifications', 'me'],
    queryFn: async () => {
      try { return (await api.get('/verifications/me')).data; } 
      catch (error: any) { if (error.response?.status === 404) return null; throw error; }
    },
    enabled: userRole !== 'Freteiro'
  });

  // 🔥 SOLUÇÃO DO BUG: Recarrega todos os dados automaticamente quando a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      if (userRole !== 'Freteiro') {
        refetchItems();
        refetchVerification();
      } else {
        refetchFreights();
      }
      if (profile?.id) refetchReviews();
    }, [userRole, profile?.id])
  );

  const deactivateMutation = useMutation({
    mutationFn: async (password: string) => await api.delete('/users/me', { data: { password } }),
    onSuccess: () => { setDeleteModalVisible(false); signOut(); },
    onError: () => Alert.alert('Erro', 'Senha inválida.')
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { fullName?: string; password?: string }) => await api.put('/users/me', data),
    onSuccess: () => {
      setEditModalVisible(false);
      setEditPassword('');
      Alert.alert('Sucesso', 'Perfil atualizado!');
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar o perfil.')
  });

  const handleOpenEditModal = () => {
    setEditName(profile?.fullName || '');
    setEditPassword('');
    setEditModalVisible(true);
  };

  const renderStars = (rating: number) => {
    const filled = '★'.repeat(rating);
    const empty = '☆'.repeat(5 - rating);
    return <Text style={styles.reviewStars}>{filled}<Text style={styles.emptyStars}>{empty}</Text></Text>;
  };

  if (loadingProfile) return <View style={styles.center}><ActivityIndicator size="large" color="#EB681E" /></View>;

  return (
    <ScrollView style={styles.container} stickyHeaderIndices={[1]}>
      {/* HEADER PRINCIPAL */}
      <View style={styles.header}>
        {/* Botão de Sair Realocado para Cima */}
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
            <Ionicons
              name="log-out-outline"
              size={16}
              color="#DC2626"
              style={{ marginRight: 8 }}
            />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>

        <View style={[styles.avatarPlaceholder, userRole === 'Freteiro' && {backgroundColor: '#334155'}]}>
          <Text style={styles.avatarText}>{profile?.fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{profile?.fullName}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        
        {/* SELOS DINÂMICOS */}
        {userRole === 'Freteiro' ? (
           <View style={styles.freightBadge}><Text style={styles.freightText}>🚚 Parceiro Logístico</Text></View>
        ) : profile?.isVerified ? (
          <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Usuário Verificado</Text></View>
        ) : verificationStatus?.status === 'Processando_IA' || verificationStatus?.status === 'Analise_Manual' ? (
          <View style={styles.pendingBadge}><Text style={styles.pendingText}>⏳ Documentos em Análise</Text></View>
        ) : verificationStatus?.status === 'Rejeitado' ? (
          <View style={styles.rejectedBadge}><Text style={styles.rejectedText}>❌ Verificação Rejeitada</Text></View>
        ) : (
          <View style={styles.unverifiedBadge}><Text style={styles.unverifiedText}>Conta Limitada (Pendente Verificação)</Text></View>
        )}

        <View style={styles.ratingBox}>
          <Text style={styles.ratingValue}>{profile?.ratingAverage ? Number(profile.ratingAverage).toFixed(1) : '0.0'}</Text>
          <Text style={styles.ratingLabel}>★ {profile?.ratingCount || 0} avaliações</Text>
        </View>
      </View>

      {/* MENU DAS TABS */}
      <View style={styles.tabsHeader}>
        {userRole === 'Freteiro' ? (
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'fretes' && styles.tabBtnActive]} onPress={() => setActiveTab('fretes')}>
            <Text style={[styles.tabBtnText, activeTab === 'fretes' && styles.tabBtnTextActive]}>Meus Fretes</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'itens' && styles.tabBtnActive]} onPress={() => setActiveTab('itens')}>
            <Text style={[styles.tabBtnText, activeTab === 'itens' && styles.tabBtnTextActive]}>Meus Itens</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'avaliacoes' && styles.tabBtnActive]} onPress={() => setActiveTab('avaliacoes')}>
          <Text style={[styles.tabBtnText, activeTab === 'avaliacoes' && styles.tabBtnTextActive]}>Avaliações</Text>
        </TouchableOpacity>
      </View>

      {/* CONTEÚDO */}
      <View style={styles.listContainer}>
        {activeTab === 'fretes' && (
          loadingFreights ? <ActivityIndicator color="#EB681E" /> : (
            myFreights?.length ? myFreights.map((freight: any) => (
              <TouchableOpacity key={freight.id} style={styles.freightCard} onPress={() => router.push(`/freight/${freight.id}`)}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>📦 {freight.item?.title || 'Removido'}</Text>
                  <Text style={{color: '#10B981', fontWeight: 'bold'}}>Status: {freight.status}</Text>
                  <Text style={{color: '#EB681E', marginTop: 4}}>Proposta: R$ {Number(freight.estimatedPrice).toFixed(2)}</Text>
                </View>
                <Text style={{color: '#9CA3AF', fontSize: 24}}>{'>'}</Text>
              </TouchableOpacity>
            )) : <Text style={styles.emptyText}>Você ainda não realizou nenhum frete.</Text>
          )
        )}

        {activeTab === 'itens' && (
          loadingItems ? <ActivityIndicator color="#EB681E" /> : (
            myItems?.length ? myItems.map((item: any) => (
              <TouchableOpacity key={item.id} style={styles.itemCard} onPress={() => router.push(`/item/${item.id}`)}>
                {item.imageUrls?.length > 0 ? (
                  <Image source={{ uri: item.imageUrls[0] }} style={styles.itemThumb} />
                ) : (
                  <View style={styles.itemThumbPlaceholder}><Text style={{color: '#94A3B8', fontSize: 10}}>Sem foto</Text></View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={[styles.itemStatus, item.status === 'Doado' && { color: '#3B82F6' }, item.status === 'Reservado' && { color: '#F59E0B' }]}>{item.status}</Text>
                </View>
              </TouchableOpacity>
            )) : <Text style={styles.emptyText}>Você ainda não postou nada.</Text>
          )
        )}

        {activeTab === 'avaliacoes' && (
          loadingReviews ? <ActivityIndicator color="#EB681E" /> : (
            myReviews?.length ? myReviews.map((review: any) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.reviewer.fullName}</Text>
                  {renderStars(review.rating)}
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
              </View>
            )) : <Text style={styles.emptyText}>Você ainda não recebeu avaliações.</Text>
          )
        )}
      </View>

      <View style={styles.actions}>
        {/* BOTÃO DE VERIFICAÇÃO SÓ APARECE PARA QUEM PRECISA */}
        {userRole !== 'Freteiro' && !profile?.isVerified && (
          <TouchableOpacity 
            style={verificationStatus?.status === 'Rejeitado' ? styles.btnVerifyDanger : styles.btnVerify} 
            onPress={() => router.push('/verification')}
          >
            <Ionicons name="shield-checkmark" size={20} color="#FFF" style={styles.buttonIcon} />
            <Text style={styles.btnVerifyText}>
              {verificationStatus?.status === 'Processando_IA' || verificationStatus?.status === 'Analise_Manual' 
                ? 'Acompanhar Verificação' 
                : verificationStatus?.status === 'Rejeitado' 
                ? 'Tentar Verificação Novamente' 
                : 'Enviar Documentos e Remover Trava'}
            </Text>
          </TouchableOpacity>
        )}

        {/* MENU DE CONFIGURAÇÕES  */}
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingsRow} onPress={handleOpenEditModal}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="person-outline" size={22} color="#334155" />
              <Text style={styles.settingsText}>Editar Perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.settingsDivider} />

          <TouchableOpacity style={styles.settingsRow} onPress={() => { setPasswordConfirm(''); setDeleteModalVisible(true); }}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="trash-outline" size={22} color="#DC2626" />
              <Text style={[styles.settingsText, { color: '#DC2626' }]}>Desativar Conta</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FCA5A5" />
          </TouchableOpacity>
        </View>

      </View>

      {/* MODAL EXCLUSÃO DE CONTA */}
      <Modal visible={deleteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Confirmar Exclusão</Text>
                <Text style={styles.modalSubText}>Digite sua senha para desativar a conta permanentemente:</Text>
                <TextInput style={styles.modalInput} placeholder="Sua senha" secureTextEntry value={passwordConfirm} onChangeText={setPasswordConfirm} />
                <View style={styles.modalRow}>
                    <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.modalBtnCancel}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { if(!passwordConfirm) return Alert.alert('Atenção', 'Senha obrigatória'); deactivateMutation.mutate(passwordConfirm); }} style={styles.modalBtnConfirmDanger}>
                      {deactivateMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmDangerText}>Desativar</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* MODAL DE EDIÇÃO DE PERFIL - DESIGN REFINADO */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Editar Perfil</Text>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                    <Ionicons name="close-circle" size={28} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.inputLabel}>Nome Completo</Text>
                <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="Seu nome" />
                
                <Text style={styles.inputLabel}>Nova Senha (Opcional)</Text>
                <TextInput style={styles.modalInput} value={editPassword} onChangeText={setEditPassword} placeholder="Deixe em branco para não alterar" secureTextEntry />
                
                <TouchableOpacity style={styles.modalBtnPrimary} disabled={updateProfileMutation.isPending} onPress={() => {
                    const payload: any = {};
                    if (editName.trim() && editName !== profile?.fullName) payload.fullName = editName.trim();
                    if (editPassword.trim()) payload.password = editPassword.trim();
                    if (Object.keys(payload).length > 0) updateProfileMutation.mutate(payload);
                    else setEditModalVisible(false);
                  }}>
                  {updateProfileMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Salvar Alterações</Text>}
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { alignItems: 'center', padding: 30, borderBottomWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  
  logoutButton: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 20, zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  logoutText: { color: "#DC2626", fontWeight: "bold", fontSize: 14 },
  
  avatarPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#EB681E', justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 3 },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  email: { color: '#64748B', marginBottom: 12 },
  
  freightBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  freightText: { color: '#334155', fontWeight: 'bold', fontSize: 12 },
  verifiedBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#10B981' },
  verifiedText: { color: '#10B981', fontWeight: 'bold', fontSize: 12 },
  unverifiedBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#FCA5A5' },
  unverifiedText: { color: '#DC2626', fontWeight: 'bold', fontSize: 12 },
  pendingBadge: { backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#F59E0B' },
  pendingText: { color: '#D97706', fontWeight: 'bold', fontSize: 12 },
  rejectedBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#DC2626' },
  rejectedText: { color: '#991B1B', fontWeight: 'bold', fontSize: 12 },
  
  ratingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  ratingValue: { fontSize: 18, fontWeight: 'bold', color: '#D97706', marginRight: 6 },
  ratingLabel: { color: '#64748B', fontWeight: 'bold' },
  
  tabsHeader: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  tabBtn: { flex: 1, padding: 16, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  tabBtnActive: { borderColor: '#EB681E' },
  tabBtnText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 15 },
  tabBtnTextActive: { color: '#EB681E' },
  
  listContainer: { padding: 20, minHeight: 200 },
  
  itemCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 12, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  freightCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 12, elevation: 2, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  itemThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#E2E8F0' },
  itemThumbPlaceholder: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  itemInfo: { marginLeft: 16, flex: 1 },
  itemTitle: { fontWeight: 'bold', fontSize: 16, color: '#0F172A' },
  itemStatus: { color: '#10B981', fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  
  reviewCard: { paddingVertical: 16, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, elevation: 2, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  reviewerName: { fontWeight: 'bold', color: '#0F172A', fontSize: 15 },
  reviewStars: { color: '#F59E0B', fontSize: 16, letterSpacing: 2 },
  emptyStars: { color: '#E2E8F0' },
  reviewComment: { color: '#475569', fontSize: 14, lineHeight: 20 },
  reviewDate: { color: '#94A3B8', fontSize: 12, marginTop: 8 },
  
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 30, fontStyle: 'italic', fontSize: 15 },
  
  actions: { padding: 20, gap: 12, marginBottom: 30 },
  btnVerify: { padding: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderRadius: 14, backgroundColor: '#10B981', elevation: 2, marginBottom: 12 },
  btnVerifyDanger: { padding: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderRadius: 14, backgroundColor: '#DC2626', elevation: 2, marginBottom: 12 },
  btnVerifyText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 },
  
  // Estilos do Novo Menu Moderno
  settingsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 1 },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center' },
  settingsText: { fontSize: 16, fontWeight: '600', color: '#334155', marginLeft: 12 },
  settingsDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 54 }, 

  // Modais Refinados
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, elevation: 5 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  modalSubText: { marginBottom: 20, color: '#64748B', fontSize: 15 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 6, marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#CBD5E1', padding: 16, borderRadius: 12, marginBottom: 15, fontSize: 16, backgroundColor: '#F8FAFC' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, alignItems: 'center', marginTop: 10 },
  modalBtnCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { color: '#64748B', fontWeight: 'bold', fontSize: 16 },
  
  modalBtnPrimary: { backgroundColor: '#EB681E', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  confirmText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  
  modalBtnConfirmDanger: { backgroundColor: '#DC2626', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  confirmDangerText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});