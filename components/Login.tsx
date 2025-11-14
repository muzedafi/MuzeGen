import React, { useState } from 'react';
import { authService } from '../services/authService';

const LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAASFBMVEUAAAD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igAojv8eAAAAGHRSTlMAAQIDBAUGBwgJCgsMDQ4PEBslQiYqAAADLklEQVR42u2c25qqMBBGJQkiCCoouHr/l/y2BBPKKDEz3czs/T9s1x5KmslMZiYAgGAY3vF4vL58Z9qthL3xYh3JPhfX/b/KfsP+jK/9yfYXT7b/pM5p234y9Zq+f6Tty1r5OwBOP9j6f7Zt/5Hif9jkv7bu/2vhfwXw/zrwv8Dwv8DwX8LwX8LwX8LwX8bwT8bwn4zw34z/L8H/l+D/S/B/IfqfBfyfBvxPBvwPBvyPBvxvAf+fBP+fBPyfBvyfBPyfBPyfBP+/BP6/BPyfBP6/hP/fkv9fkv8/Jf9/S/4/y/4/y/4/y/4/y/5/yP4/yP5/yP4/yP5/yP6/w/7/wP6/w/7/wP5/w/5/w/7/wP6/Q/9/Q/9/Q/9/Q/9/Q/9/RP9/RP9/RP9/RP9/RP9/hP9/hP9/hP9/hP9/hP9/xP9/xP9/xP9/xP9/xP8v6f/L+n/y/p/8v6f/L+n/S/p/0v6f9L+n/S/p/0v6f9P8X9f8X9f8X9f8X9f8X9f8X9f8b+v8b+v8b+v8b+v8b+v8b+v8j+v8j+v8j+v8j+v8j+v8j+v8j+v8r+v8r+v8r+v8r+v8r+v8r+v8z+v8z+v8z+v8z+v8z+v8z+v8z+v8D/f8A/f8A/f8A/f8A/f8A/f8B/f8B/f8B/f8B/f8B/f8B/f8D//8A//8A//8A//8A//8A//8A//8A/+f8n/N/zv85/+f8n/N/zv+v8H9F8L+i+B9R/I8o/kcE/yOC/xHB/4jgv8PwL8PwC8MvDL8w/MLwC8MvjH8M4x/D+Mew/DGMf4zhH8P4xzD+8X/v4/+u7/+67/96+L+m8F9T+K8p/FcV/quKf1XBv6rgv6XwX1L4Lyl8V5T+Kgp/FcG/qvi/pvBfE/ivCfxXBP4rAv+VwH8p8L+0+F8B/L8O/C/g/wt/v/59/j77x+Px+PLzBxG5Yv1H+QGgAAAAAElFTkSuQmCC';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email tidak boleh kosong.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Silakan masukkan alamat email yang valid.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      await authService.login(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <form 
          onSubmit={handleSubmit}
          className="bg-[#161324]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 md:p-12 text-center"
        >
          <div className="flex justify-center mb-6">
            <img src={LOGO_BASE64} alt="MuzeGen AI Logo" style={{ width: 48, height: 48 }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Selamat Datang di MuzeGen AI</h1>
          <p className="text-gray-400 mb-8">Silakan masuk untuk melanjutkan.</p>
          
          <div className="mb-4 text-left">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Alamat Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anda@contoh.com"
              className="w-full bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              aria-describedby="email-error"
              disabled={isLoading}
            />
            {error && (
              <p id="email-error" className="text-red-400 text-sm mt-2">
                {error}
              </p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3 px-6 text-lg font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-teal-500/50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
