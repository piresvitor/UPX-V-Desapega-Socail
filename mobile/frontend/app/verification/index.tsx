import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../src/services/api';

export default function VerificationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [cpf, setCpf] = useState('');
  const [rgImage, setRgImage] = useState<string | null>(null);
  const [incomeImage, setIncomeImage] = useState<string | null>(null);

  const { data: verificationStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ['verifications', 'me'],
    queryFn: async () => {
      try {
        const response = await api.get('/verifications/me');
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
    retry: false
  });

  const submitVerificationMutation = useMutation({
    mutationFn: async () => {
      const token = await AsyncStorage.getItem('@DesapegaSocial:token');
      const formData = new FormData();
      formData.append('cpf', cpf.replace(/\D/g, ''));

      if (rgImage) {
        formData.append('identityDocument', {
          uri: rgImage,
          name: 'rg.jpg',
          type: 'image/jpeg'
        } as any);
      }

      if (incomeImage) {
        formData.append('incomeProof', {
          uri: incomeImage,
          name: 'income.jpg',
          type: 'image/jpeg'
        } as any);
      }

      const response = await fetch('http://10.0.2.2:3333/verifications', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Erro ao processar documentos.');
      }

      return await response.json();
    },
    onSuccess: () => {
      Alert.alert('Enviado com Sucesso', 'Seus documentos foram reenviados para análise.');
      queryClient.invalidateQueries({ queryKey: ['verifications', 'me'] });
      router.back(); 
    },
    onError: (error: any) => {
      Alert.alert('Erro no Envio', error.message);
    }
  });

  const handleCpfChange = (value: string) => {
    let numeric = value.replace(/\D/g, '');
    numeric = numeric.replace(/(\d{3})(\d)/, '$1.$2');
    numeric = numeric.replace(/(\d{3})(\d)/, '$1.$2');
    numeric = numeric.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCpf(numeric);
  };

  const pickImage = async (setTarget: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9, 
    });

    if (!result.canceled) {
      setTarget(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (cpf.replace(/\D/g, '').length !== 11) {
      return Alert.alert('Atenção', 'Digite um CPF válido com 11 números.');
    }
    if (!rgImage || !incomeImage) {
      return Alert.alert('Atenção', 'Você precisa enviar ambas as fotos (Identidade e Comprovante).');
    }
    submitVerificationMutation.mutate();
  };

  if (loadingStatus) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  // Se estiver em processamento, bloqueia a UI
  if (verificationStatus && ['Processando_IA', 'Analise_Manual'].includes(verificationStatus.status)) {
    return (
      <View style={styles.center}>
        <Text style={styles.statusTitle}>⏳ Em Análise</Text>
        <Text style={styles.statusText}>
          Seus documentos foram recebidos e estão sendo avaliados (Status: {verificationStatus.status.replace('_', ' ')}).
        </Text>
        <Text style={styles.statusSub}>Aguarde a aprovação para que sua conta seja destravada.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar ao Perfil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Se já foi aprovado, bloqueia a UI com sucesso
  if (verificationStatus?.status === 'Aprovado_Auto' || verificationStatus?.status === 'Aprovado_Admin') {
    return (
      <View style={styles.center}>
        <Text style={styles.statusTitle}>✅ Conta Aprovada</Text>
        <Text style={styles.statusText}>Sua identidade já foi verificada e você tem acesso total ao Desapega Social!</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar ao Perfil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Se chegou aqui, ou é a primeira vez (null) ou foi Rejeitado. Renderizamos o form.
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>X Fechar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Verificação de Identidade</Text>
        
        {/* NOVO: BANNER DE REJEIÇÃO */}
        {verificationStatus?.status === 'Rejeitado' && (
          <View style={styles.rejectionBanner}>
            <Text style={styles.rejectionTitle}>❌ Documentos Recusados</Text>
            <Text style={styles.rejectionText}>
              {verificationStatus.adminMessage || 'A Inteligência Artificial identificou divergências ou não conseguiu ler sua foto. Por favor, envie uma foto com boa iluminação e tente novamente.'}
            </Text>
          </View>
        )}

        <View style={styles.lgpdBanner}>
          <Text style={styles.lgpdTitle}>🔒 Privacidade em 1º Lugar (LGPD)</Text>
          <Text style={styles.lgpdText}>
            Seu CPF será fortemente criptografado (AES-256) antes de ir para o banco de dados. 
            Suas fotos não serão salvas em nossos discos; elas são processadas em memória volátil (RAM) apenas pela Inteligência Artificial e descartadas imediatamente.
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>CPF (Apenas números)</Text>
        <TextInput
          style={styles.input}
          placeholder="000.000.000-00"
          keyboardType="numeric"
          maxLength={14}
          value={cpf}
          onChangeText={handleCpfChange}
        />

        <Text style={styles.label}>Foto do RG ou CNH</Text>
        <Text style={styles.subLabel}>Envie uma foto legível do seu documento de identidade.</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setRgImage)}>
          {rgImage ? (
            <Image source={{ uri: rgImage }} style={styles.previewImage} />
          ) : (
            <Text style={styles.uploadText}>📸 Tocar para adicionar imagem</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Holerite ou CadÚnico</Text>
        <Text style={styles.subLabel}>Comprovante de renda ou participação em programa social.</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setIncomeImage)}>
          {incomeImage ? (
            <Image source={{ uri: incomeImage }} style={styles.previewImage} />
          ) : (
            <Text style={styles.uploadText}>📸 Tocar para adicionar imagem</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitBtn, submitVerificationMutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitVerificationMutation.isPending}
        >
          {submitVerificationMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Reenviar para Análise</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#FFF' },
  
  header: { padding: 20, paddingTop: 40, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  closeBtn: { marginBottom: 10 },
  closeBtnText: { color: '#64748B', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 15 },
  
  // Estilo do Banner de Rejeição
  rejectionBanner: { backgroundColor: '#FEF2F2', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA', marginBottom: 15 },
  rejectionTitle: { fontWeight: 'bold', color: '#991B1B', marginBottom: 5 },
  rejectionText: { fontSize: 13, color: '#B91C1C', lineHeight: 20 },

  lgpdBanner: { backgroundColor: '#ECFDF5', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  lgpdTitle: { fontWeight: 'bold', color: '#065F46', marginBottom: 5 },
  lgpdText: { fontSize: 13, color: '#047857', lineHeight: 20 },

  form: { padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 5, marginTop: 15 },
  subLabel: { fontSize: 13, color: '#64748B', marginBottom: 10 },
  input: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', padding: 15, borderRadius: 10, fontSize: 16, color: '#0F172A' },
  
  uploadBox: { height: 120, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadText: { color: '#64748B', fontWeight: 'bold' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  submitBtn: { backgroundColor: '#10B981', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30, elevation: 2 },
  submitBtnDisabled: { backgroundColor: '#94A3B8', elevation: 0 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  statusTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  statusText: { fontSize: 16, color: '#334155', textAlign: 'center', marginBottom: 10, lineHeight: 24 },
  statusSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 30 },
  backBtn: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  backBtnText: { color: '#475569', fontWeight: 'bold' }
});