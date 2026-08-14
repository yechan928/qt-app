import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ngrok으로 개발 서버를 터널링해서 휴대폰으로 테스트할 때, Next.js dev 서버가
  // localhost가 아닌 출처의 요청(정적 자산·HMR)을 보안상 기본 차단하는 것을 허용.
  allowedDevOrigins: ['*.ngrok-free.dev', '*.ngrok-free.app'],
};

export default nextConfig;
