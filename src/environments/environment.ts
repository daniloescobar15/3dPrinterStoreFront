export const environment = {
  production: false,
  apiUrl: {
    direct: 'http://localhost:9000/api',
    proxy: '/api'
  },
  auth: {
    applicationId: '5359f6f6-42ef-43a5-a840-29d0e8b961fa',
    authKey: 'Lb3Ouo5CGfIJjevorClMq7Kc0l3lBjEZ_Ii3c-hJiLP5AEQPDRdw7TWy'
  },
  payment: {
    callbackUrl: 'https://localhost:9000/api/payment/callback'
  }
};
