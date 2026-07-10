/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // El dashboard vive en su propio host (cenit.localhost / dominio propio en prod),
    // sin basePath. Google exige que las fotos de perfil vengan de lh3.googleusercontent.com.
    images: {
        remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
    },
};

export default nextConfig;
