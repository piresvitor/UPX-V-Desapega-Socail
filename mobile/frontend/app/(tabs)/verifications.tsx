import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Dimensions } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

export default function AdminVerificationsScreen() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Estado para o Zoom da Imagem
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
      Alert.alert('Sucesso', 'Decisão registrada com sucesso.');
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

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#111827" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={32} color="#10B981" />
        <Text style={styles.title}>Auditoria Manual (LGPD)</Text>
        <Text style={styles.sub}>{queue?.length || 0} usuários aguardando revisão</Text>
      </View>

      <FlatList
        data={queue}
        keyExtractor={item => item.id}
        onRefresh={refetch}
        refreshing={isLoading}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={styles.empty}>Fila de trabalho vazia. Ótimo trabalho!</Text>}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <Text style={styles.userName}>{item.userName}</Text>
            <Text style={styles.userEmail}>{item.userEmail}</Text>
            
            <View style={styles.imagesRow}>
              {/* Clicar na imagem abre o Zoom */}
              <TouchableOpacity style={styles.imageContainer} onPress={() => setZoomedImage(item.identityDocumentUrl)}>
                <Text style={styles.imageLabel}>Identidade (RG/CNH) 🔍</Text>
                <Image source={{ uri: item.identityDocumentUrl }} style={styles.docImage} />
              </TouchableOpacity>
              
              {/* Clicar na imagem abre o Zoom */}
              <TouchableOpacity style={styles.imageContainer} onPress={() => setZoomedImage(item.incomeProofUrl)}>
                <Text style={styles.imageLabel}>Comprovante 🔍</Text>
                <Image source={{ uri: item.incomeProofUrl }} style={styles.docImage} />
              </TouchableOpacity>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.btnReject} onPress={() => setSelectedRequest(item)}>
                <Ionicons name="close-circle-outline" size={20} color="#DC2626" style={styles.buttonIcon} />
                <Text style={styles.btnRejectText}>Rejeitar Mídia</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnApprove} onPress={() => handleApprove(item.id)}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.btnApproveText}>Aprovar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* ========================================= */}
      {/* MODAL 1: VISUALIZADOR DE IMAGEM AMPLIADA  */}
      {/* ========================================= */}
      <Modal visible={!!zoomedImage} transparent animationType="fade">
        <View style={styles.zoomOverlay}>
          <TouchableOpacity style={styles.closeZoomBtn} onPress={() => setZoomedImage(null)}>
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>
          {zoomedImage && (
            <Image source={{ uri: zoomedImage }} style={styles.zoomImage} />
          )}
        </View>
      </Modal>

      {/* ========================================= */}
      {/* MODAL 2: REJEITAR E ENVIAR MENSAGEM       */}
      {/* ========================================= */}
      <Modal visible={!!selectedRequest} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Rejeitar Verificação</Text>
                <Text style={styles.modalSubText}>Informe o motivo para o usuário corrigir (Ex: Foto borrada, Documento cortado).</Text>
                
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="Motivo da rejeição..." 
                  value={rejectReason} 
                  onChangeText={setRejectReason} 
                  multiline
                />
                
                <View style={styles.modalRow}>
                    <TouchableOpacity onPress={() => setSelectedRequest(null)} style={styles.modalBtnCancel}>
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.modalBtnConfirmDanger}
                      onPress={() => decisionMutation.mutate({ id: selectedRequest.id, action: 'Rejeitar', message: rejectReason })}
                    >
                      {decisionMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmDangerText}>Confirmar Rejeição</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 30, paddingTop: 60, backgroundColor: '#FFF', alignItems: 'center', borderBottomWidth: 1, borderColor: '#E5E7EB', elevation: 2 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 10 },
  sub: { color: '#6B7280', marginTop: 5, fontSize: 15 },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 40, fontStyle: 'italic', fontSize: 15 },
  
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2 },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  userEmail: { color: '#6B7280', marginBottom: 15 },
  
  imagesRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  imageContainer: { flex: 1 },
  imageLabel: { fontSize: 12, fontWeight: 'bold', color: '#4B5563', marginBottom: 5 },
  docImage: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#E5E7EB', resizeMode: 'cover' },
  
  actions: { flexDirection: 'row', gap: 10 },
  btnReject: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEE2E2', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnRejectText: { color: '#DC2626', fontWeight: 'bold', fontSize: 16 },
  btnApprove: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnApproveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  buttonIcon: { marginRight: 8 },
  
  // Estilos do Modal de Rejeição
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#1F2937' },
  modalSubText: { marginBottom: 15, color: '#6B7280', fontSize: 15 },
  modalInput: { borderWidth: 1, borderColor: '#D1D5DB', padding: 14, borderRadius: 10, marginBottom: 20, minHeight: 80, textAlignVertical: 'top', backgroundColor: '#F9FAFB', fontSize: 16 },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, alignItems: 'center' },
  modalBtnCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { color: '#6B7280', fontWeight: 'bold', fontSize: 16 },
  modalBtnConfirmDanger: { backgroundColor: '#DC2626', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  confirmDangerText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Estilos do Modal de Zoom
  zoomOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  zoomImage: { width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.8, resizeMode: 'contain' },
  closeZoomBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 2 }
});