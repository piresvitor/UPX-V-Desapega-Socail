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
                <Text style={styles.btnRejectText}>Rejeitar Mídia</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnApprove} onPress={() => handleApprove(item.id)}>
                <Text style={styles.btnApproveText}>✓ Aprovar</Text>
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
  header: { padding: 30, paddingTop: 60, backgroundColor: '#FFF', alignItems: 'center', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginTop: 10 },
  sub: { color: '#6B7280', marginTop: 5 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontStyle: 'italic' },
  
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2 },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  userEmail: { color: '#6B7280', marginBottom: 15 },
  
  imagesRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  imageContainer: { flex: 1 },
  imageLabel: { fontSize: 12, fontWeight: 'bold', color: '#374151', marginBottom: 5 },
  docImage: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#E5E7EB', resizeMode: 'cover' },
  
  actions: { flexDirection: 'row', gap: 10 },
  btnReject: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center' },
  btnRejectText: { color: '#DC2626', fontWeight: 'bold' },
  btnApprove: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center' },
  btnApproveText: { color: '#FFF', fontWeight: 'bold' },
  
  // Estilos do Modal de Rejeição
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#111827' },
  modalSubText: { marginBottom: 15, color: '#6B7280', fontSize: 14 },
  modalInput: { borderWidth: 1, borderColor: '#D1D5DB', padding: 14, borderRadius: 10, marginBottom: 20, minHeight: 80, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtnCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { color: '#6B7280', fontWeight: 'bold' },
  modalBtnConfirmDanger: { backgroundColor: '#DC2626', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  confirmDangerText: { color: '#FFF', fontWeight: 'bold' },

  // Estilos do Modal de Zoom
  zoomOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  zoomImage: { width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.8, resizeMode: 'contain' },
  closeZoomBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 2 }
});