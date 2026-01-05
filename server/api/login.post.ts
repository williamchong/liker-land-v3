import { jwtDecode } from 'jwt-decode'
import { FieldValue } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  let body: {
    walletAddress: string
    message: string
    signature: string
    email?: string
    loginMethod: string
  } | undefined
  try {
    body = await readBody(event)
  }
  catch (error) {
    console.error(error)
    throw createError({
      status: 400,
      message: 'INVALID_BODY',
    })
  }
  if (!body) {
    throw createError({
      status: 400,
      message: 'MISSING_BODY',
    })
  }
  if (!body.walletAddress) {
    throw createError({
      status: 400,
      message: 'MISSING_ADDRESS',
    })
  }
  if (!checkIsEVMAddress(body.walletAddress)) {
    throw createError({
      status: 400,
      message: 'INVALID_ADDRESS',
    })
  }
  if (!body.message) {
    throw createError({
      status: 400,
      message: 'MISSING_MESSAGE',
    })
  }
  if (!body.signature) {
    throw createError({
      status: 400,
      message: 'MISSING_SIGNATURE',
    })
  }

  let likeWallet: string | undefined
  let jwtId: string | undefined
  let token: string | undefined
  let intercomToken: string | undefined
  try {
    const authorizeRes = await getLikeCoinAPIFetch()<{
      jwtid: string
      token: string
      intercomToken?: string
    }>('/wallet/authorize', {
      method: 'POST',
      body: {
        wallet: body.walletAddress,
        signature: body.signature,
        message: body.message,
        signMethod: 'personal_sign',
        expiresIn: '30d',
      },
    })
    ;({ likeWallet } = jwtDecode<{ likeWallet: string }>(authorizeRes.token))
    jwtId = authorizeRes.jwtid
    token = authorizeRes.token
    intercomToken = authorizeRes.intercomToken
  }
  catch (error) {
    console.error('Failed to authorize wallet:', error)
    throw createError({
      status: 401,
      message: 'WALLET_AUTHORIZATION_FAILED',
    })
  }

  let userInfoRes: LikerProfileResponseData | undefined = undefined
  try {
    userInfoRes = await fetchLikerProfileInfo(token)
  }
  catch (error) {
    console.error('Failed to fetch user info for wallet', error)
    throw createError({
      status: 401,
      message: 'LOGIN_WITHOUT_LIKER_ID',
    })
  }
  if (!userInfoRes) {
    throw createError({
      status: 401,
      message: 'CANNOT_FETCH_USER_INFO',
    })
  }

  const userInfo = {
    evmWallet: body.walletAddress,
    likeWallet,
    token,
    jwtId,
    intercomToken,
    likerId: userInfoRes.user,
    displayName: userInfoRes.displayName,
    description: userInfoRes.description,
    avatar: userInfoRes.avatar,
    email: body.email || userInfoRes.email,
    loginMethod: body.loginMethod,
    isLikerPlus: userInfoRes.isLikerPlus || false,
    likerPlusPeriod: userInfoRes.likerPlusPeriod,
  }
  await setUserSession(event, { user: userInfo })

  const userDocRef = getUserCollection().doc(body.walletAddress)
  await userDocRef.set({
    loginTimestamp: FieldValue.serverTimestamp(),
    accessTimestamp: FieldValue.serverTimestamp(),
    loginMethod: body.loginMethod,
  }, { merge: true })

  return userInfo
})
