import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/services/api';

export default function CreateReviewScreen() {
  // Recebe os parâmetros via URL (Quem será avaliado e de qual item)
  const { revieweeId, revieweeName, itemId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // Mutação para salvar a avaliação
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      await api.post('/reviews', {
        revieweeId,
        itemId,
        rating,
        comment: comment.trim() || undefined, // Se vazio, manda undefined
      });
    },
    onSuccess: () => {
      Alert.alert('Sucesso!', 'Avaliação enviada. Obrigado por ajudar a comunidade!');
      
      // Atualiza o perfil da pessoa para a nova nota aparecer instantaneamente
      queryClient.invalidateQueries({ queryKey: ['users', revieweeId] });
      
      // OBRIGATÓRIO: Avisa a tela de Chat para esconder o banner dourado na mesma hora
      queryClient.invalidateQueries({ queryKey: ['review_check'] }); 
      
      router.back(); // Fecha o modal
    },
    onError: (error: any) => {
      // Regra de Negócio: O backend barra duplicatas com erro 403/409 (Unique Index)
      const msg = error.response?.data?.error || 'Não foi possível enviar a avaliação.';
      Alert.alert('Atenção', msg);
    }
  });

  const handleSubmit = () => {
    if (rating === 0) {
      return Alert.alert('Atenção', 'Por favor, selecione pelo menos 1 estrela.');
    }
    submitReviewMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Avaliar Experiência</Text>
        <Text style={styles.subtitle}>
          Como foi a sua interação com <Text style={styles.highlight}>{revieweeName}</Text>?
        </Text>
      </View>

      {/* Componente Interativo de 5 Estrelas */}
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            onPress={() => setRating(star)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={star <= rating ? 'star' : 'star-outline'} 
              size={48} 
              color={star <= rating ? '#FFD700' : '#E0E0E0'} 
              style={styles.starIcon}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingText}>
        {rating === 0 ? 'Toque para avaliar' : rating === 5 ? 'Excelente!' : `${rating} Estrelas`}
      </Text>

      {/* Campo de Comentário */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Comentário (Opcional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Deixe um elogio ou conte como foi..."
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={250}
        />
      </View>

      {/* Botão de Envio */}
      <TouchableOpacity 
        style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]} 
        onPress={handleSubmit}
        disabled={rating === 0 || submitReviewMutation.isPending}
      >
        {submitReviewMutation.isPending ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitBtnText}>Enviar Avaliação</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', padding: 24 },
  
  header: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 },
  highlight: { color: '#2196F3', fontWeight: 'bold' },

  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  starIcon: { marginHorizontal: 4 },
  ratingText: { textAlign: 'center', fontSize: 16, color: '#4B5563', fontWeight: '500', marginBottom: 30 },

  inputContainer: { marginBottom: 30 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  textInput: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, fontSize: 16, minHeight: 120, textAlignVertical: 'top', color: '#111827' },

  submitBtn: { backgroundColor: '#2196F3', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#9CA3AF' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});