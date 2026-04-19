import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';

export default function DriverRadarScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(20); 
  
  const [selectedFreight, setSelectedFreight] = useState<any>(null);
  const [priceInput, setPriceInput] = useState('');

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('Permissão negada');

        let loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch (error) {
        console.warn('GPS falhou. Usando localização de Sorocaba-SP como fallback.');
        setLocation({ lat: -23.5015, lng: -47.4581 }); 
      }
    })();
  }, []);

  const { data: freights, isLoading, refetch } = useQuery({
    queryKey: ['freights', 'available', radius, location?.lat, location?.lng],
    queryFn: async () => {
      if (!location) return [];
      const response = await api.get(`/freights/available?lat=${location.lat}&lng=${location.lng}&radius=${radius}`);
      return response.data;
    },
    enabled: !!location, 
  });

  // MUTAÇÃO TURBINADA: Aceita a corrida e cria o chat no Frontend
  const acceptFreightMutation = useMutation({
    mutationFn: async ({ freightId, price, itemId }: { freightId: string, price: number, itemId: string }) => {
      // 1. Aceita a corrida
      await api.patch(`/freights/${freightId}/accept`, { estimatedPrice: price });
      
      // 2. Cria a sala de chat para negociar o frete
      const chatResponse = await api.post('/chats', { itemId: itemId, type: 'FREIGHT' });
      
      return { roomId: chatResponse.data.roomId, price };
    },
    onSuccess: (data) => {
      Alert.alert('Corrida Aceita!', 'Abrindo canal de comunicação com o solicitante...');
      queryClient.invalidateQueries({ queryKey: ['freights'] });
      setSelectedFreight(null);
      setPriceInput('');
      
      // 3. Monta a mensagem e envia como parâmetro para a rota
      const mensagemInicial = `Olá! Aceitei sua solicitação de frete. Minha proposta é de R$ ${data.price.toFixed(2)}. Vamos combinar os detalhes da entrega?`;
      
      router.push({
        pathname: `../chat/${data.roomId}`,
        params: { autoMsg: mensagemInicial }
      });
    },
    onError: (error: any) => {
      if (error.response?.status === 409 || error.response?.status === 403) {
        Alert.alert('Puxa Vida!', 'Outro motorista aceitou essa corrida antes de você.');
      } else {
        Alert.alert('Erro', 'Não foi possível aceitar o frete.');
      }
      setSelectedFreight(null);
      refetch();
    }
  });

  const handleAccept = () => {
    const price = parseFloat(priceInput.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      return Alert.alert('Atenção', 'Digite um valor válido para o frete.');
    }
    acceptFreightMutation.mutate({ 
      freightId: selectedFreight.freightId, 
      price,
      itemId: selectedFreight.item.id // Enviamos o ID do item para criar o chat
    });
  };

  if (!location || isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FF9800" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="location-outline" size={32} color="#FF9800" />
        <Text style={styles.title}>Radar de Entregas</Text>
        <Text style={styles.sub}>Buscando doações precisando de transporte</Text>

        <View style={styles.filterRow}>
          {[10, 20, 50].map((km) => (
            <TouchableOpacity 
              key={km} 
              style={[styles.filterBtn, radius === km && styles.filterBtnActive]}
              onPress={() => setRadius(km)}
            >
              <Text style={[styles.filterBtnText, radius === km && styles.filterBtnTextActive]}>{km} km</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={freights}
        keyExtractor={(item: any) => item.freightId}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={{ padding: 20, gap: 15 }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum frete disponível nesse raio no momento.</Text>}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.distanceText}>📍 {Number(item.distanceKm).toFixed(1)} km daqui</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>Disponível</Text></View>
            </View>
            
            <Text style={styles.itemName}>📦 {item.item.title}</Text>
            
            <TouchableOpacity 
              style={styles.acceptBtn}
              onPress={() => setSelectedFreight(item)}
            >
              <Text style={styles.acceptBtnText}>Fazer Proposta</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={!!selectedFreight} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Aceitar Corrida</Text>
                <Text style={styles.modalSubText}>Qual o valor estimado para transportar o item <Text style={{fontWeight: 'bold'}}>{selectedFreight?.item?.title}</Text>?</Text>
                
                <Text style={styles.inputLabel}>Sua Proposta (R$)</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="Ex: 50,00" 
                  keyboardType="numeric" 
                  value={priceInput} 
                  onChangeText={setPriceInput} 
                />
                
                <View style={styles.modalRow}>
                    <TouchableOpacity onPress={() => setSelectedFreight(null)} style={styles.modalBtnCancel}>
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAccept} style={styles.modalBtnConfirm}>
                      {acceptFreightMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmText}>Enviar e Aceitar</Text>}
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
  sub: { color: '#6B7280', marginTop: 5, textAlign: 'center' },
  filterRow: { flexDirection: 'row', marginTop: 20, gap: 10 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' },
  filterBtnActive: { backgroundColor: '#FFF3E0', borderColor: '#FF9800' },
  filterBtnText: { color: '#4B5563', fontWeight: 'bold' },
  filterBtnTextActive: { color: '#E65100' },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  distanceText: { fontWeight: 'bold', color: '#FF9800', fontSize: 15 },
  badge: { backgroundColor: '#E0F2F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#00796B', fontSize: 12, fontWeight: 'bold' },
  itemName: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  acceptBtn: { backgroundColor: '#1F2937', padding: 15, borderRadius: 12, alignItems: 'center' },
  acceptBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontStyle: 'italic', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#111827' },
  modalSubText: { marginBottom: 20, color: '#6B7280', fontSize: 15, lineHeight: 22 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: '#D1D5DB', padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 18, backgroundColor: '#F9FAFB', fontWeight: 'bold', color: '#10B981' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, alignItems: 'center' },
  modalBtnCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  modalBtnConfirm: { backgroundColor: '#FF9800', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  confirmText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});