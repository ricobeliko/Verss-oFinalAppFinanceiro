// src/features/auth/accountDeletionFlow.js
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

/**
 * Mapeia erros de exclusão de conta para mensagens seguras e neutras ao usuário.
 * NUNCA expõe error.message, error.stack ou mensagens de backend.
 */
export function mapAccountDeletionError(error) {
  const errorCode = error?.code || '';
  const reason = error?.details?.reason || '';

  if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
    return 'Senha incorreta. Tente novamente.';
  }
  if (
    errorCode === 'functions/failed-precondition' &&
    reason === 'recent-auth-required'
  ) {
    return 'Não foi possível atualizar sua autenticação. Entre novamente e tente de novo.';
  }
  if (errorCode === 'auth/too-many-requests') {
    return 'Muitas tentativas consecutivas. Aguarde alguns instantes e tente novamente.';
  }
  if (errorCode === 'auth/network-request-failed') {
    return 'Falha de conexão com a rede. Verifique sua internet e tente novamente.';
  }
  if (errorCode === 'functions/unavailable') {
    return 'Serviço temporariamente indisponível. Tente novamente mais tarde.';
  }
  if (errorCode === 'auth/missing-password') {
    return 'Por favor, informe a sua senha atual.';
  }
  if (errorCode === 'auth/invalid-session') {
    return 'Sessão inválida. Faça login novamente para prosseguir.';
  }

  // Fallback determinístico neutro: NUNCA vaza error.message ou detalhes de erro
  return 'Não foi possível excluir sua conta. Tente novamente.';
}

/**
 * Executa a orquestração destrutiva de exclusão de conta em conformidade com o Recent Auth Gate.
 * 
 * Ordem canônica inegociável:
 * 1. Validar currentUser, email e senha (fail-closed)
 * 2. Criar credencial com EmailAuthProvider.credential
 * 3. reauthenticateWithCredential (ou reauthenticateFn injetada)
 * 4. currentUser.getIdToken(true) para forçar auth_time recente (<= 300s)
 * 5. Invocação da callable deleteUserAccount
 * 6. Retornar { success: true }
 * 
 * Nenhuma senha é armazenada ou persistida.
 */
export async function executeAccountDeletion({
  currentUser,
  password,
  reauthenticateFn = reauthenticateWithCredential,
  getCallableFn,
}) {
  // 1. Validação fail-closed
  if (!currentUser || !currentUser.email) {
    const err = new Error('Sessão inválida. Faça login novamente para prosseguir.');
    err.code = 'auth/invalid-session';
    throw err;
  }

  if (!password || !password.trim()) {
    const err = new Error('Por favor, informe a sua senha atual.');
    err.code = 'auth/missing-password';
    throw err;
  }

  // 2. Criação da credencial
  const credential = EmailAuthProvider.credential(currentUser.email, password);

  // 3. Reautenticação recente
  await reauthenticateFn(currentUser, credential);

  // 4. Forçar renovação do ID Token (garante auth_time <= 300s no token para o backend)
  await currentUser.getIdToken(true);

  // 5. Obtenção e invocação da callable autenticada
  let deleteAccountCallable;
  if (getCallableFn) {
    deleteAccountCallable = await getCallableFn();
  } else {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const { app } = await import('../../utils/firebase');
    const functions = getFunctions(app, 'southamerica-east1');
    deleteAccountCallable = httpsCallable(functions, 'deleteUserAccount');
  }

  const result = await deleteAccountCallable();

  return { success: true, result };
}
