import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

export default function VerificationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [cpf, setCpf] = useState('');
  const [rgImage, setRgImage] = useState<string | null>(null);
  const [incomeImage, setIncomeImage] = useState<string | null>(null);
  const [isLgpdModalVisible, setIsLgpdModalVisible] = useState(false); 

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

      const response = await fetch('https://desapega-social-api.onrender.com/verifications', {
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
      Alert.alert('Enviado com Sucesso', 'Seus documentos foram enviados para análise.');
      queryClient.invalidateQueries({ queryKey: ['verifications', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#EB681E" /></View>;
  }

  // UI Bloqueada: Em Processamento
  if (verificationStatus && ['Processando_IA', 'Analise_Manual'].includes(verificationStatus.status)) {
    return (
      <View style={styles.center}>
        <Ionicons name="time-outline" size={64} color="#F59E0B" style={{ marginBottom: 20 }} />
        <Text style={styles.statusTitle}>Em Análise</Text>
        <Text style={styles.statusText}>
          Seus documentos foram recebidos e estão sendo avaliados com segurança pela nossa Inteligência Artificial.
        </Text>
        <Text style={styles.statusSub}>Aguarde a aprovação para que sua conta seja liberada.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar ao Perfil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // UI Bloqueada: Aprovado
  if (verificationStatus?.status === 'Aprovado_Auto' || verificationStatus?.status === 'Aprovado_Admin') {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-circle" size={64} color="#10B981" style={{ marginBottom: 20 }} />
        <Text style={styles.statusTitle}>Conta Aprovada!</Text>
        <Text style={styles.statusText}>Sua identidade e renda foram verificadas. Você já tem acesso total ao Desapega Social.</Text>
        <TouchableOpacity style={[styles.backBtn, { borderColor: '#10B981' }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: '#10B981' }]}>Voltar ao Perfil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* HEADER PADRONIZADO */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.title}>Validação de Conta</Text>
        </View>
        <Text style={styles.headerSub}>Precisamos confirmar seus dados para manter a comunidade segura para todos.</Text>
      </View>

      <View style={styles.form}>
        
        {/* BANNER DE REJEIÇÃO */}
        {verificationStatus?.status === 'Rejeitado' && (
          <View style={styles.rejectionBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.rejectionTitle}> Documentos Recusados</Text>
            </View>
            <Text style={styles.rejectionText}>
              {verificationStatus.adminMessage || 'A Inteligência Artificial não conseguiu ler sua foto com clareza. Por favor, envie uma foto nítida e bem iluminada para tentarmos novamente.'}
            </Text>
          </View>
        )}

        {/* BANNER LGPD SIMPLIFICADO */}
        <View style={styles.lgpdBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="shield-checkmark" size={20} color="#047857" />
            <Text style={styles.lgpdTitle}> Privacidade e Segurança</Text>
          </View>
          <Text style={styles.lgpdText}>
            Nós levamos a sua privacidade a sério. Suas fotos são usadas apenas para análise da nossa Inteligência Artificial e <Text style={{fontWeight: 'bold'}}>não ficam salvas em nosso banco de dados</Text>.
          </Text>
          <TouchableOpacity onPress={() => setIsLgpdModalVisible(true)} style={{ marginTop: 10 }}>
            <Text style={styles.lgpdLink}>Ler termos de privacidade completos</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>CPF (Apenas números)</Text>
        <TextInput
          style={styles.input}
          placeholder="000.000.000-00"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          maxLength={14}
          value={cpf}
          onChangeText={handleCpfChange}
        />

        <Text style={styles.label}>Foto do RG ou CNH</Text>
        <Text style={styles.subLabel}>Envie uma foto legível do seu documento oficial de identidade.</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setRgImage)}>
          {rgImage ? (
            <Image source={{ uri: rgImage }} style={styles.previewImage} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="camera-outline" size={32} color="#94A3B8" />
              <Text style={styles.uploadText}>Tocar para adicionar foto</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Holerite ou CadÚnico</Text>
        <Text style={styles.subLabel}>Para manter o caráter social do app, precisamos validar sua renda ou participação em programas sociais.</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setIncomeImage)}>
          {incomeImage ? (
            <Image source={{ uri: incomeImage }} style={styles.previewImage} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="document-text-outline" size={32} color="#94A3B8" />
              <Text style={styles.uploadText}>Tocar para adicionar foto</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitBtn, submitVerificationMutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitVerificationMutation.isPending}
          activeOpacity={0.8}
        >
          {submitVerificationMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.submitBtnText}>Enviar para Análise</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL DE TERMOS LGPD */}
      <Modal visible={isLgpdModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.lgpdModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Privacidade e LGPD</Text>
              <TouchableOpacity onPress={() => setIsLgpdModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSectionTitle}>Por que pedimos seus documentos?</Text>
              <Text style={styles.modalParagraph}>O Desapega Social é uma plataforma voltada para ajudar quem realmente precisa. A verificação de identidade e renda existe para evitar fraudes, golpes e garantir que as doações cheguem a famílias em situação de vulnerabilidade.</Text>

              <Text style={styles.modalSectionTitle}>O que fazemos com suas fotos?</Text>
              <Text style={styles.modalParagraph}>As fotos do seu RG/CNH e do seu Holerite/CadÚnico são enviadas diretamente para o nosso Motor de Inteligência Artificial. Assim que a IA extrai os textos para verificar seu nome e teto de renda, <Text style={{fontWeight: 'bold'}}>a imagem é permanentemente destruída da nossa memória</Text>. Não guardamos nenhum arquivo de imagem em nossos servidores.</Text>

              <Text style={styles.modalSectionTitle}>O que fazemos com seu CPF?</Text>
              <Text style={styles.modalParagraph}>O seu CPF é armazenado no banco de dados utilizando criptografia de nível militar (AES-256). Ele serve unicamente para garantir que uma pessoa não crie múltiplas contas na plataforma.</Text>

              <Text style={styles.modalSectionTitle}>Seus Direitos (LGPD)</Text>
              <Text style={styles.modalParagraph}>Você é dono dos seus dados. A qualquer momento, você pode acessar a aba "Perfil" e selecionar "Desativar Conta". Esta ação apagará permanentemente todo o seu histórico, registros e dados pessoais dos nossos servidores de forma irreversível.</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => setIsLgpdModalVisible(false)}>
              <Text style={styles.confirmText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#F8FAFC' },
  
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  closeBtn: { marginRight: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  headerSub: { fontSize: 15, color: '#64748B', lineHeight: 22 },
  
  // Banner de Rejeição
  rejectionBanner: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#FCA5A5', marginBottom: 20 },
  rejectionTitle: { fontWeight: 'bold', color: '#DC2626', fontSize: 16 },
  rejectionText: { fontSize: 14, color: '#991B1B', lineHeight: 22 },

  // Banner LGPD
  lgpdBanner: { backgroundColor: '#ECFDF5', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#6EE7B7', marginBottom: 25 },
  lgpdTitle: { fontWeight: 'bold', color: '#047857', fontSize: 16 },
  lgpdText: { fontSize: 14, color: '#065F46', lineHeight: 22 },
  lgpdLink: { fontSize: 14, color: '#059669', fontWeight: 'bold', textDecorationLine: 'underline' },

  form: { paddingHorizontal: 24, paddingTop: 10 },
  label: { fontSize: 15, fontWeight: 'bold', color: '#334155', marginBottom: 6, marginLeft: 4, marginTop: 10 },
  subLabel: { fontSize: 13, color: '#64748B', marginBottom: 12, marginLeft: 4 },
  
  // Inputs e Uploads Premium
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 18, borderRadius: 14, fontSize: 16, color: '#0F172A', marginBottom: 10 },
  uploadBox: { height: 140, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
  uploadText: { color: '#64748B', fontWeight: '600', marginTop: 8 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  submitBtn: { backgroundColor: '#EB681E', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 20, elevation: 3, shadowColor: '#EB681E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, flexDirection: 'row', justifyContent: 'center' },
  submitBtnDisabled: { backgroundColor: '#CBD5E1', elevation: 0, shadowOpacity: 0 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 },

  // Telas de Status de Conta
  statusTitle: { fontSize: 26, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  statusText: { fontSize: 16, color: '#475569', textAlign: 'center', marginBottom: 10, lineHeight: 24 },
  statusSub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 40 },
  backBtn: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 14, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  backBtnText: { color: '#334155', fontWeight: 'bold', fontSize: 16 },

  // Estilos do Modal LGPD
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  lgpdModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  modalSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginTop: 15, marginBottom: 5 },
  modalParagraph: { fontSize: 15, color: '#475569', lineHeight: 24 },
  modalBtnPrimary: { backgroundColor: '#EB681E', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  confirmText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});