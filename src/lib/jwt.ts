import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'SonexaMusicSecretJWTKey987654321';
const secret = new TextEncoder().encode(JWT_SECRET);

export async function generateToken(payload: any): Promise<string> {
    return await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secret);
}

export async function verifyToken(token: string): Promise<any> {
    try {
        const { payload } = await jose.jwtVerify(token, secret);
        return payload;
    } catch (e) {
        return null;
    }
}
