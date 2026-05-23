import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Dimensions, Platform, Image } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

export default function AdminVerificationsScreen() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const { data: queue, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'verifications', 'pending'],
    queryFn: async () => (await api.get('/admin/verifications/pending')).data,
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ id, action, message }: { id: string, action: string, message?: string }) => {
      await api.patch(`/admin/verifications/${id}`, { action, adminMessage: message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications', 'pending'] });
      setSelectedRequest(null);
      setRejectReason('');
    },
    onError: () => Alert.alert('Erro', 'Não foi possível processar a decisão.')
  });

  const handleApprove = (id: string) => {
    Alert.alert('Aprovar Documento', 'Confirmar a autenticidade deste usuário?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aprovar', onPress: () => decisionMutation.mutate({ id, action: 'Aprovar' }) }
    ]);
  };

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#EB681E" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Auditoria Manual</Text>
        <Text style={styles.sub}>{queue?.length || 0} usuários aguardando revisão</Text>
      </View>

      <FlatList
        data={queue}
        keyExtractor={item => item.id}
        onRefresh={refetch}
        refreshing={isLoading}
        contentContainerStyle={{ padding: 24, gap: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Fila vazia. Ótimo trabalho!</Text>}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <Text style={styles.userName}>{item.userName}</Text>
            <Text style={styles.userEmail}>{item.userEmail}</Text>
            
            <View style={styles.imagesRow}>
              <TouchableOpacity style={styles.imageContainer} onPress={() => setZoomedImage(item.identityDocumentUrl)}>
                <Text style={styles.imageLabel}>Identidade</Text>
                <Image source={{ uri: item.identityDocumentUrl }} style={styles.docImage} />
                <Ionicons name="expand" size={16} color="#FFF" style={styles.zoomIcon} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.imageContainer} onPress={() => setZoomedImage(item.incomeProofUrl)}>
                <Text style={styles.imageLabel}>Comprovante</Text>
                <Image source={{ uri: item.incomeProofUrl }} style={styles.docImage} />
                <Ionicons name="expand" size={16} color="#FFF" style={styles.zoomIcon} />
              </TouchableOpacity>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.btnReject} onPress={() => setSelectedRequest(item)}>
                <Ionicons name="close-circle-outline" size={20} color="#DC2626" style={styles.buttonIcon} />
                <Text style={styles.btnRejectText}>Rejeitar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnApprove} onPress={() => handleApprove(item.id)}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.btnApproveText}>Aprovar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={!!zoomedImage} transparent animationType="fade">
        <View style={styles.zoomOverlay}>
          <TouchableOpacity style={styles.closeZoomBtn} onPress={() => setZoomedImage(null)}>
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>
          {zoomedImage && <Image source={{ uri: zoomedImage }} style={styles.zoomImage} />}
        </View>
      </Modal>

      <Modal visible={!!selectedRequest} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Rejeitar Verificação</Text>
                  <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                    <Ionicons name="close-circle" size={28} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubText}>Informe o motivo para o usuário corrigir.</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="Motivo da rejeição..." 
                  value={rejectReason} 
                  onChangeText={setRejectReason} 
                  multiline
                />
                <TouchableOpacity 
                  style={styles.modalBtnConfirmDanger}
                  onPress={() => decisionMutation.mutate({ id: selectedRequest.id, action: 'Rejeitar', message: rejectReason })}
                >
                  {decisionMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmDangerText}>Confirmar Rejeição</Text>}
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
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginTop: 10 },
  sub: { color: '#64748B', fontSize: 15, marginTop: 4 },
  
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  userEmail: { color: '#64748B', fontSize: 14, marginBottom: 16 },
  
  imagesRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  imageContainer: { flex: 1, position: 'relative' },
  imageLabel: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 6 },
  docImage: { width: '100%', height: 140, borderRadius: 12, backgroundColor: '#E2E8F0' },
  zoomIcon: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 6 },
  
  actions: { flexDirection: 'row', gap: 12 },
  btnReject: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnRejectText: { color: '#DC2626', fontWeight: 'bold', fontSize: 15 },
  btnApprove: { flex: 1, padding: 16, borderRadius: 14, backgroundColor: '#10B981', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnApproveText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  buttonIcon: { marginRight: 8 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  modalSubText: { marginBottom: 20, color: '#64748B', fontSize: 15 },
  modalInput: { borderWidth: 1, borderColor: '#CBD5E1', padding: 16, borderRadius: 14, marginBottom: 20, minHeight: 100, textAlignVertical: 'top', backgroundColor: '#F8FAFC', fontSize: 16 },
  modalBtnConfirmDanger: { backgroundColor: '#DC2626', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  confirmDangerText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  zoomOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  zoomImage: { width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.8, resizeMode: 'contain' },
  closeZoomBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontStyle: 'italic', fontSize: 15 },
});