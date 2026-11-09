
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Campaign = {
  id: string;
  name: string;
  description: string | null;
};

type Character = {
  id: string;
  name: string;
  player_name: string | null;
  character_class: string | null;
  level: number;
  experience?: number;
};

export default function CampaignPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      setMessage('Configuração do Supabase não encontrada.');
      setLoading(false);
      return;
    }

    const client = createClient(url, key);
    setSupabase(client);

    async function loadCampaign() {
      const { data: sessionData } = await client.auth.getSession();

      if (!sessionData.session) {
        setMessage('Você precisa entrar na sua conta para acessar esta campanha.');
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;

      const { data: profile } = await client
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      const userRole = profile?.role || 'player';
      setRole(userRole);

      const { data: campaignData, error: campaignError } = await client
        .from('campaigns')
        .select('id,name,description')
        .eq('id', campaignId)
        .maybeSingle();

      if (campaignError || !campaignData) {
        setMessage(campaignError?.message || 'Campanha não encontrada.');
        setLoading(false);
        return;
      }

      setCampaign(campaignData);

      if (userRole === 'master') {
        const { data, error } = await client
          .from('characters')
          .select('id,name,player_name,character_class,level,experience')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false });

        if (error) {
          setMessage(error.message);
        } else {
          setCharacters((data || []) as Character[]);
        }
      } else {
        const { data, error } = await client
          .from('characters')
          .select('id,name,player_name,character_class,level')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false });

        if (error) {
          setMessage(error.message);
        } else {
          setCharacters((data || []) as Character[]);
        }
      }

      setLoading(false);
    }

    void loadCampaign();
  }, [campaignId]);

  if (loading) {
    return (
      <main className="shell">
        <p className="muted">Carregando campanha...</p>
      </main>
    );
  }

  if (!campaign) {
    return (
      <main className="shell">
        <section className="card">
          <h2>Não foi possível abrir a campanha</h2>
          <p className="muted">{message}</p>
          <Link href="/">Voltar ao painel</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="top">
        <div className="brand">
          UNIVERSAL CROSSING
          <span>CAMPAIGN MANAGER</span>
        </div>
        <div className="pill">INDIE CROSS v3.4 · BETA</div>
      </header>

      <Link href="/" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
        ← Voltar ao painel
      </Link>

      <section className="hero" style={{ marginTop: 20 }}>
        <div className="eyebrow">CENTRAL DA CAMPANHA</div>
        <h1>{campaign.name}</h1>
        <p>{campaign.description || 'Esta campanha ainda não possui descrição.'}</p>

        <div className="stats">
          <div className="stat">
            PERSONAGENS
            <b>{characters.length}</b>
          </div>
          <div className="stat">
            ACESSO
            <b>{role === 'master' ? 'MESTRE' : 'JOGADOR'}</b>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Personagens da campanha</h2>

        {characters.length === 0 ? (
          <p className="empty">
            Ainda não existem personagens nesta campanha.
          </p>
        ) : (
          <div className="list">
            {characters.map(character => (
              <Link
                key={character.id}
                href={`/character/${character.id}`}
                className="item"
                style={{
                  display: 'block',
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                <strong>{character.name}</strong>
                <small>
                  {character.player_name || 'Jogador não definido'}
                  {' · '}
                  {character.character_class || 'Classe não definida'}
                  {' · '}
                  Nível {character.level}
                  {role === 'master' && ` · ${character.experience ?? 0} XP`}
                </small>
              </Link>
            ))}
          </div>
        )}
      </section>

      {message && (
        <div className="notice error">{message}</div>
      )}

      <footer className="footer">
        UNIVERSAL CROSSING CAMPAIGN MANAGER · Projeto em desenvolvimento
      </footer>
    </main>
  );
}
