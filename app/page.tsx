'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function Home() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [configured, setConfigured] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');
  const [role, setRole] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);

  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  const [characterName, setCharacterName] = useState('');
  const [playerName, setPlayerName] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) return;

    const client = createClient(url, key);
    setSupabase(client);
    setConfigured(true);

    client.auth.getSession().then(({ data }) => {
      if (data.session) {
        void loadUser(
          client,
          data.session.user.id,
          data.session.user.email || ''
        );
      }
    });

    const { data: listener } = client.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          void loadUser(
            client,
            session.user.id,
            session.user.email || ''
          );
        } else {
          setSessionEmail('');
          setRole('');
          setCampaigns([]);
          setCharacters([]);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadUser(
    client: SupabaseClient,
    userId: string,
    userEmail: string
  ) {
    setSessionEmail(userEmail);

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
      .order('created_at');

    if (campaignError) {
      setMessage(campaignError.message);
      setError(true);
    } else {
      setCampaigns(campaignData || []);

      if (campaignData?.length) {
        setSelectedCampaignId(current =>
          current || campaignData[0].id
        );
      }
    }

    const fields =
      userRole === 'master'
        ? 'id,name,player_name,character_class,level,experience'
        : 'id,name,player_name,character_class,level';

    const { data: characterData, error: characterError } =
      await client
        .from('characters')
        .select(fields)
        .order('created_at', { ascending: false });

    if (characterError) {
      setMessage(characterError.message);
      setError(true);
    } else {
      setCharacters(characterData || []);
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      setError(true);
    } else {
      setMessage('Login realizado!');
      setError(false);
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setMessage('Você saiu da conta.');
  }

  async function addCampaign(e: React.FormEvent) {
    e.preventDefault();

    if (!supabase || role !== 'master') return;

    setBusy(true);

    const { error } = await supabase
      .from('campaigns')
      .insert({
        name: campaignName,
        description: campaignDescription,
      });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      setError(true);
      return;
    }

    setCampaignName('');
    setCampaignDescription('');
    setMessage('Campanha criada!');
    setError(false);

    await loadUser(
      supabase,
      (await supabase.auth.getUser()).data.user!.id,
      sessionEmail
    );
  }

  async function addCharacter(e: React.FormEvent) {
    e.preventDefault();

    if (
      !supabase ||
      role !== 'master' ||
      !selectedCampaignId
    ) return;

    setBusy(true);

    const { error } = await supabase
      .from('characters')
      .insert({
        campaign_id: selectedCampaignId,
        name: characterName,
        player_name: playerName,
        level: 1,
        experience: 0,
        attributes: {},
        skills: {},
        status: {},
      });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      setError(true);
      return;
    }

    setCharacterName('');
    setPlayerName('');
    setMessage('Personagem cadastrado!');
    setError(false);

    const { data } = await supabase
      .from('characters')
      .select('id,name,player_name,character_class,level,experience')
      .order('created_at', { ascending: false });

    setCharacters(data || []);
  }

  return (
    <main className="shell">

      <header className="top">
        <div className="brand">
          UNIVERSAL CROSSING
          <span>CAMPAIGN MANAGER</span>
        </div>

        <div className="pill">
          INDIE CROSS v3.4 · BETA
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">
          SEU UNIVERSO, SUAS REGRAS
        </div>

        <h1>
          Uma campanha.
          <br />
          Infinitas possibilidades.
        </h1>

        <p>
          Gerencie personagens, acompanhe a evolução
          dos jogadores e mantenha toda a campanha
          em um só lugar.
        </p>

        <div className="stats">
          <div className="stat">
            CAMPANHAS
            <b>{campaigns.length}</b>
          </div>

          <div className="stat">
            PERSONAGENS
            <b>{characters.length}</b>
          </div>

          <div className="stat">
            ACESSO
            <b>
              {role === 'master'
                ? 'MESTRE'
                : sessionEmail
                  ? 'JOGADOR'
                  : 'RESTRITO'}
            </b>
          </div>
        </div>
      </section>

      {!configured ? (
        <section className="card">
          <h2>Configuração necessária</h2>
          <p className="muted">
            Verifique as variáveis de ambiente do Supabase.
          </p>
        </section>
      ) : !sessionEmail ? (
        <section
          className="card"
          style={{ maxWidth: 480, margin: 'auto' }}
        >
          <h2>Entrar na campanha</h2>

          <p className="muted">
            Acesse com seu e-mail e senha cadastrados.
          </p>

          <form onSubmit={signIn}>
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
              />
            </div>

            <div className="field">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Sua senha"
              />
            </div>

            <button disabled={busy}>
              {busy ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </section>
      ) : (
        <>
          <div className="row" style={{ marginBottom: 18 }}>
            <div>
              <strong>Bem-vindo, {sessionEmail}</strong>
              <div
                className="muted"
                style={{ fontSize: 12, marginTop: 4 }}
              >
                Permissão: {role === 'master' ? 'Mestre' : 'Jogador'}
              </div>
            </div>

            <button className="secondary" onClick={signOut}>
              Sair
            </button>
          </div>

          <div className="grid">

            <section className="card">
              <h2>Campanhas</h2>

              {campaigns.length ? (
                <div className="list">
                  {campaigns.map(c => (
                    <Link
                      href={`/campaign/${c.id}`}
                      className="item item-link"
                      key={c.id}
                    >
                      <strong>{c.name}</strong>
                      <small>
                        {c.description || 'Sem descrição'}
                      </small>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="empty">
                  Nenhuma campanha cadastrada.
                </p>
              )}

              {role === 'master' && (
                <form
                  onSubmit={addCampaign}
                  style={{ marginTop: 18 }}
                >
                  <div className="field">
                    <label>Nome da campanha</label>
                    <input
                      value={campaignName}
                      onChange={e => setCampaignName(e.target.value)}
                      required
                      placeholder="Minha campanha"
                    />
                  </div>

                  <div className="field">
                    <label>Descrição</label>
                    <input
                      value={campaignDescription}
                      onChange={e => setCampaignDescription(e.target.value)}
                      placeholder="Uma breve descrição"
                    />
                  </div>

                  <button disabled={busy}>
                    Criar campanha
                  </button>
                </form>
              )}
            </section>

            <section className="card">
              <h2>Personagens</h2>

              {characters.length ? (
                <div className="list">
                  {characters.map(c => (
                    <Link
                      href={`/character/${c.id}`}
                      className="item item-link"
                      key={c.id}
                    >
                      <strong>{c.name}</strong>

                      <small>
                        {c.player_name || 'Jogador não definido'}
                        {' · '}
                        Nível {c.level}
                        {role === 'master' &&
                          ` · ${c.experience ?? 0} XP`}
                      </small>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="empty">
                  Nenhum personagem cadastrado ainda.
                </p>
              )}

              {role === 'master' && (
                <form
                  onSubmit={addCharacter}
                  style={{ marginTop: 18 }}
                >
                  <div className="field">
                    <label>Nome do personagem</label>
                    <input
                      value={characterName}
                      onChange={e => setCharacterName(e.target.value)}
                      required
                      placeholder="Nome do personagem"
                    />
                  </div>

                  <div className="field">
                    <label>Nome do jogador</label>
                    <input
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      placeholder="Nome do jogador"
                    />
                  </div>

                  <div className="field">
                    <label>Campanha</label>
                    <select
                      value={selectedCampaignId}
                      onChange={e =>
                        setSelectedCampaignId(e.target.value)
                      }
                      required
                    >
                      <option value="">
                        Selecione uma campanha
                      </option>

                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    disabled={busy || campaigns.length === 0}
                  >
                    {campaigns.length === 0
                      ? 'Crie uma campanha primeiro'
                      : 'Cadastrar personagem'}
                  </button>
                </form>
              )}
            </section>

          </div>
        </>
      )}

      {message && (
        <div className={`notice ${error ? 'error' : 'ok'}`}>
          {message}
        </div>
      )}

      <footer className="footer">
        UNIVERSAL CROSSING CAMPAIGN MANAGER
        · Projeto em desenvolvimento
      </footer>

    </main>
  );
}
