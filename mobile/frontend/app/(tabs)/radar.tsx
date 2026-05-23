import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
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

  const acceptFreightMutation = useMutation({
    mutationFn: async ({ freightId, price, itemId }: { freightId: string, price: number, itemId: string }) => {
      await api.patch(`/freights/${freightId}/accept`, { estimatedPrice: price });
      const chatResponse = await api.post('/chats', { itemId: itemId, type: 'FREIGHT' });
      return { roomId: chatResponse.data.roomId, price };
    },
    onSuccess: (data) => {
      Alert.alert('Corrida Aceita!', 'Abrindo canal de comunicação com o solicitante...');
      queryClient.invalidateQueries({ queryKey: ['freights'] });
      setSelectedFreight(null);
      setPriceInput('');
      
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
      itemId: selectedFreight.item.id 
    });
  };

  if (!location || isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#EB681E" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="location-outline" size={32} color="#EB681E" />
        <Text style={styles.title}>Radar de Entregas</Text>
        <Text style={styles.sub}>Buscando doações precisando de transporte</Text>

        <View style={styles.filterRow}>
          {[10, 20, 50].map((km) => (
            <TouchableOpacity 
              key={km} 
              style={[styles.filterBtn, radius === km && styles.filterBtnActive]}
              onPress={() => setRadius(km)}
              activeOpacity={0.7}
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
        contentContainerStyle={{ padding: 20, gap: 15, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum frete disponível nesse raio no momento.</Text>}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.distanceText}>📍 {Number(item.distanceKm).toFixed(1)} km daqui</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>Disponível</Text></View>
            </View>
            
            <Text style={styles.itemName} numberOfLines={2}>📦 {item.item.title}</Text>
            
            <TouchableOpacity 
              style={styles.acceptBtn}
              onPress={() => setSelectedFreight(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubbles-outline" size={20} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.acceptBtnText}>Fazer Proposta</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* MODAL DE ACEITE DE CORRIDA (MODERNO) */}
      <Modal visible={!!selectedFreight} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Aceitar Corrida</Text>
                  <TouchableOpacity onPress={() => setSelectedFreight(null)}>
                    <Ionicons name="close-circle" size={28} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubText}>Qual o valor estimado para transportar o item <Text style={{fontWeight: 'bold', color: '#0F172A'}}>{selectedFreight?.item?.title}</Text>?</Text>
                
                <Text style={styles.inputLabel}>Sua Proposta (R$)</Text>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder="Ex: 50,00" 
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric" 
                  value={priceInput} 
                  onChangeText={setPriceInput} 
                />
                
                <TouchableOpacity 
                  onPress={handleAccept} 
                  style={[styles.modalBtnConfirm, acceptFreightMutation.isPending && styles.modalBtnDisabled]}
                  disabled={acceptFreightMutation.isPending}
                >
                  {acceptFreightMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmText}>Enviar e Aceitar</Text>}
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
    paddingBottom: 24, 
    backgroundColor: '#FFFFFF', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderColor: '#E2E8F0', 
    elevation: 2 
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0F172A', marginTop: 10 },
  sub: { color: '#64748B', marginTop: 5, textAlign: 'center', fontSize: 15 },
  
  filterRow: { flexDirection: 'row', marginTop: 24, gap: 12 },
  filterBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1' },
  filterBtnActive: { backgroundColor: '#FFF3EB', borderColor: '#EB681E', borderWidth: 2 },
  filterBtnText: { color: '#64748B', fontWeight: 'bold', fontSize: 14 },
  filterBtnTextActive: { color: '#EB681E' },
  
  card: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  distanceText: { fontWeight: 'bold', color: '#EB681E', fontSize: 14 },
  badge: { backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { color: '#10B981', fontSize: 12, fontWeight: 'bold' },
  itemName: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 24, lineHeight: 28 },
  acceptBtn: { backgroundColor: '#EB681E', padding: 18, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  acceptBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  buttonIcon: { marginRight: 8 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontStyle: 'italic', fontSize: 15 },
  
  // Estilos do Modal Moderno
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  modalSubText: { marginBottom: 24, color: '#64748B', fontSize: 15, lineHeight: 22 },
  
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 8, marginLeft: 4 },
  modalInput: { borderWidth: 1, borderColor: '#CBD5E1', padding: 18, borderRadius: 14, marginBottom: 24, fontSize: 18, backgroundColor: '#F8FAFC', fontWeight: 'bold', color: '#10B981' },
  
  modalBtnConfirm: { backgroundColor: '#EB681E', paddingVertical: 18, borderRadius: 14, alignItems: 'center', shadowColor: '#EB681E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3 },
  modalBtnDisabled: { backgroundColor: '#CBD5E1', elevation: 0, shadowOpacity: 0 },
  confirmText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});