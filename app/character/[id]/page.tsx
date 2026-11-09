
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const ATTRIBUTES = [
  'Ataque',
  'Mobilidade',
  'Defesa',
  'Poder',
  'Técnica',
  'Emocional',
  'Estamina',
];

const SKILLS = [
  'Aparência',
  'Astúcia',
  'Atenção',
  'Combate',
  'Fôlego',
  'Instinto',
  'Línguas',
  'Lógica',
  'Magia',
  'Manobra',
  'Mira',
  'Natureza',
  'Ofício',
  'Sorratez',
  'Vital',
];

type Character = {
  id: string;
  campaign_id: string;
  name: string;
  player_name: string | null;
  character_class: string | null;
  level: number;
  experience?: number;
  attributes: Record<string, number> | null;
  skills: Record<string, number> | null;
  status: Record<string, number> | null;
  notes: string | null;
};

function StatBar({
  label,
  value,
  editable,
  onChange,
}: {
  label: string;
  value: number;
  editable: boolean;
  onChange: (value: number) => void;
}) {
  const safeValue = Math.max(0, Math.min(20, Number(value) || 0));

  return (
    <div className="stat-bar">
      <div className="stat-heading">
        <strong>{label}</strong>
        <span>{safeValue}/20</span>
      </div>

      <div className="segments">
        {Array.from({ length: 20 }, (_, i) => (
          <span
            key={i}
            className={i < safeValue ? 'segment filled' : 'segment'}
          />
        ))}
      </div>

      {editable && (
        <input
          className="stat-input"
          type="number"
          min="0"
          max="20"
          value={safeValue}
          onChange={e => onChange(Number(e.target.value))}
        />
      )}
    </div>
  );
}

export default function CharacterPage() {
  const params = useParams();
  const characterId = params.id as string;

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);

  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [name, setName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [characterClass, setCharacterClass] = useState('');
  const [level, setLevel] = useState(1);

  const [attributes, setAttributes] = useState<Record<string, number>>({});
  const [skills, setSkills] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

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

    async function loadCharacter() {
      const { data: sessionData } = await client.auth.getSession();

      if (!sessionData.session) {
        setMessage('Você precisa entrar para acessar esta ficha.');
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

      const fields = userRole === 'master'
        ? 'id,campaign_id,name,player_name,character_class,level,experience,attributes,skills,status,notes'
        : 'id,campaign_id,name,player_name,character_class,level,attributes,skills,status,notes';

      const { data, error } = await client
        .from('characters')
        .select(fields)
        .eq('id', characterId)
        .maybeSingle();

      if (error || !data) {
        setMessage(error?.message || 'Personagem não encontrado.');
        setLoading(false);
        return;
      }

      const c = data as unknown as Character;

      setCharacter(c);
      setName(c.name || '');
      setPlayerName(c.player_name || '');
      setCharacterClass(c.character_class || '');
      setLevel(c.level || 1);
      setAttributes(c.attributes || {});
      setSkills(c.skills || {});
      setStatus(c.status || {});
      setNotes(c.notes || '');

      setLoading(false);
    }

    void loadCharacter();
  }, [characterId]);

  function changeStat(
    group: 'attributes' | 'skills',
    key: string,
    value: number
  ) {
    const safeValue = Math.max(0, Math.min(20, Number(value) || 0));

    if (group === 'attributes') {
      setAttributes(current => ({ ...current, [key]: safeValue }));
    } else {
      setSkills(current => ({ ...current, [key]: safeValue }));
    }
  }

  async function saveCharacter() {
    if (!supabase || !character || role !== 'master') return;

    setBusy(true);
    setMessage('');

    const { error } = await supabase
      .from('characters')
      .update({
        name,
        player_name: playerName,
        character_class: characterClass,
        level: Math.max(1, level),
        attributes,
        skills,
        status,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', character.id);

    setBusy(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Ficha salva com sucesso!');
      setCharacter(current =>
        current
          ? {
              ...current,
              name,
              player_name: playerName,
              character_class: characterClass,
              level: Math.max(1, level),
              attributes,
              skills,
              status,
              notes,
            }
          : null
      );
    }
  }

  if (loading) {
    return (
      <main className="shell">
        <p className="muted">Carregando ficha...</p>
      </main>
    );
  }

  if (!character) {
    return (
      <main className="shell">
        <section className="card">
          <h2>Ficha não encontrada</h2>
          <p className="muted">{message}</p>
          <Link href="/">Voltar ao painel</Link>
        </section>
      </main>
    );
  }

  const editable = role === 'master';

  return (
    <main className="shell">
      <header className="top">
        <div className="brand">
          UNIVERSAL CROSSING
          <span>CAMPAIGN MANAGER</span>
        </div>
        <div className="pill">INDIE CROSS v3.4 · BETA</div>
      </header>

      <Link
        href={`/campaign/${character.campaign_id}`}
        style={{ color: 'var(--cyan)', textDecoration: 'none' }}
      >
        ← Voltar à campanha
      </Link>

      <section className="hero" style={{ marginTop: 20 }}>
        <div className="eyebrow">FICHA DE PERSONAGEM</div>
        <h1>{name}</h1>
        <p>
          {characterClass || 'Classe não definida'}
          {' · '}
          Nível {level}
        </p>

        {editable && (
          <div className="stats">
            <div className="stat">
              EXPERIÊNCIA
              <b>{character.experience ?? 0} XP</b>
            </div>
            <div className="stat">
              ACESSO
              <b>MESTRE</b>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Informações do personagem</h2>

        <div className="grid">
          <div className="field">
            <label>Nome do personagem</label>
            <input
              value={name}
              disabled={!editable}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Jogador</label>
            <input
              value={playerName}
              disabled={!editable}
              onChange={e => setPlayerName(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Classe</label>
            <input
              value={characterClass}
              disabled={!editable}
              onChange={e => setCharacterClass(e.target.value)}
              placeholder="Classe do personagem"
            />
          </div>

          <div className="field">
            <label>Nível</label>
            <input
              type="number"
              min="1"
              value={level}
              disabled={!editable}
              onChange={e => setLevel(Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Atributos</h2>
        <p className="muted">
          Cada segmento representa 1 ponto. Máximo de 20.
        </p>

        <div className="stat-grid">
          {ATTRIBUTES.map(item => (
            <StatBar
              key={item}
              label={item}
              value={attributes[item] || 0}
              editable={editable}
              onChange={value => changeStat('attributes', item, value)}
            />
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Perícias</h2>
        <p className="muted">
          Cada segmento representa 1 ponto. Máximo de 20.
        </p>

        <div className="stat-grid">
          {SKILLS.map(item => (
            <StatBar
              key={item}
              label={item}
              value={skills[item] || 0}
              editable={editable}
              onChange={value => changeStat('skills', item, value)}
            />
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Status</h2>

        <div className="grid">
          {['Vida', 'Energia', 'Sanidade'].map(item => (
            <div className="field" key={item}>
              <label>{item}</label>
              <input
                type="number"
                min="0"
                value={status[item] ?? 0}
                disabled={!editable}
                onChange={e =>
                  setStatus(current => ({
                    ...current,
                    [item]: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Anotações</h2>
        <textarea
          value={notes}
          disabled={!editable}
          onChange={e => setNotes(e.target.value)}
          placeholder="História, observações e informações do personagem..."
          rows={5}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 10,
            background: '#0b0f18',
            color: 'var(--text)',
            border: '1px solid var(--line)',
            font: 'inherit',
          }}
        />
      </section>

      {editable && (
        <button
          onClick={saveCharacter}
          disabled={busy}
          style={{ marginTop: 18, width: '100%' }}
        >
          {busy ? 'Salvando...' : 'Salvar ficha'}
        </button>
      )}

      {message && (
        <div className="notice">
          {message}
        </div>
      )}

      <footer className="footer">
        UNIVERSAL CROSSING CAMPAIGN MANAGER · Projeto em desenvolvimento
      </footer>
    </main>
  );
}
