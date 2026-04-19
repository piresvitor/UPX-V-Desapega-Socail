import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/services/api'; 

const CATEGORIES = ['Móveis', 'Eletrônicos', 'Roupas', 'Alimentos', 'Outros'];

export default function EditItemScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Estados locais do Formulário
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // 1. Busca os dados atuais do item para preencher o formulário
  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['item', id],
    queryFn: async () => {
      const response = await api.get(`/items/${id}`);
      return response.data;
    }
  });

  // 2. Preenche os estados locais quando os dados chegam da API
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
      setCategory(item.category);
    }
  }, [item]);

  // 3. Mutação para Salvar as Alterações (PUT)
  const updateItemMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      await api.put(`/items/${id}`, updatedData);
    },
    onSuccess: () => {
      Alert.alert('Sucesso', 'Doação atualizada com sucesso!');
      // Atualiza o cache para a tela de detalhes refletir a mudança instantaneamente
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] }); // Atualiza o Feed também
      router.back();
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível salvar as alterações. Verifique sua conexão.');
    }
  });

  const handleSave = () => {
    if (!title.trim() || !description.trim() || !category) {
      Alert.alert('Atenção', 'Por favor, preencha o título, a descrição e escolha uma categoria.');
      return;
    }

    // Monta o payload
    const payload = {
      title,
      description,
      category,
      // Repassamos os dados que não foram alterados nesta tela para não perdê-los
      imageUrls: item.imageUrls || [],
      latitude: Number(item.latitude),
      longitude: Number(item.longitude)
    };

    updateItemMutation.mutate(payload);
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
  }

  if (isError || !item) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Erro ao carregar os dados do item.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#2196F3', fontWeight: 'bold' }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Editar Doação</Text>
        <Text style={styles.subHeader}>Atualize as informações do seu item abaixo.</Text>

        {/* TÍTULO */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Título do Item</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Sofá 3 Lugares Retrátil"
            maxLength={100}
          />
        </View>

        {/* CATEGORIA (Chips Horizontais) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* DESCRIÇÃO */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detalhe o estado do item, regras para retirada, etc."
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* BOTÕES */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.btn, styles.btnCancel]} 
            onPress={() => router.back()}
            disabled={updateItemMutation.isPending}
          >
            <Ionicons name="close-circle-outline" size={20} color="#DC2626" style={styles.buttonIcon} />
            <Text style={styles.btnTextCancel}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.btn, styles.btnSave, updateItemMutation.isPending && styles.btnDisabled]} 
            onPress={handleSave}
            disabled={updateItemMutation.isPending}
          >
            {updateItemMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.btnTextWhite}>Salvar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  subHeader: { fontSize: 15, color: '#6B7280', marginBottom: 30, marginTop: 5 },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: { minHeight: 120, paddingTop: 14 },
  
  // Categorias
  categoryScroll: { flexDirection: 'row', paddingTop: 4, paddingBottom: 8 },
  chip: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  chipActive: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  chipText: { color: '#6B7280', fontWeight: 'bold' },
  chipTextActive: { color: '#FFF' },

  // Rodapé e Botões
  footer: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  btnCancel: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  btnSave: { backgroundColor: '#10B981' }, 
  btnDisabled: { opacity: 0.7 },
  
  btnTextWhite: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  btnTextCancel: { color: '#DC2626', fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 },
  errorText: { color: '#DC2626', fontSize: 16, fontWeight: 'bold' }
});