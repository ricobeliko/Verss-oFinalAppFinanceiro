// src/features/auth/authErrorMap.js

/**
 * Mapeamento determinístico e neutro de erros de autenticação do Firebase.
 * Impede exposição de stack traces ou detalhes internos para o usuário final,
 * e protege contra enumeração de contas.
 *
 * @param {Object} [error]
 * @param {string} [error.code]
 * @param {string} [error.message]
 * @param {string} [defaultMessage]
 * @returns {string} Mensagem amigável e segura
 */
export function mapAuthError(
  error,
  defaultMessage = 'Ocorreu um erro na autenticação. Tente novamente.'
) {
  if (!error) return defaultMessage;
  const code = error.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-mail ou senha inválidos.';

    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso. Tente fazer login.';

    case 'auth/invalid-email':
      return 'Formato de e-mail inválido.';

    case 'auth/weak-password':
      return 'A senha deve ter no mínimo 8 caracteres.';

    case 'auth/too-many-requests':
      return 'Muitas tentativas consecutivas. Aguarde alguns instantes e tente novamente.';

    case 'auth/network-request-failed':
      return 'Falha de conexão com a rede. Verifique sua internet e tente novamente.';

    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Entre em contato com o suporte.';

    default:
      return defaultMessage;
  }
}
