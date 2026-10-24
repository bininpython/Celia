-- =====================================================================
-- Seed inicial: academia, planos-base e biblioteca de exercícios.
-- Não cria alunos nem movimentações fictícias.
-- =====================================================================

insert into public.gyms (id, name, legal_name, city, state, opening_hours)
values ('00000000-0000-4000-8000-000000000001', 'Studio Personal Célia Barbosa', 'Studio Personal Célia Barbosa',
        null, null,
        '{"seg":"06:00-22:00","ter":"06:00-22:00","qua":"06:00-22:00","qui":"06:00-22:00","sex":"06:00-21:00","sab":"08:00-12:00","dom":"fechado"}'::jsonb)
on conflict (id) do nothing;

insert into public.plans (gym_id, name, periodicity, duration_months, price, description, weekly_frequency) values
  ('00000000-0000-4000-8000-000000000001', 'Mensal',     'mensal',     1,  0, 'Cobrança mensal. Ajuste o valor em Configurações > Planos.', null),
  ('00000000-0000-4000-8000-000000000001', 'Trimestral', 'trimestral', 3,  0, 'Cobrança a cada 3 meses.', null),
  ('00000000-0000-4000-8000-000000000001', 'Semestral',  'semestral',  6,  0, 'Cobrança a cada 6 meses.', null),
  ('00000000-0000-4000-8000-000000000001', 'Anual',      'anual',      12, 0, 'Cobrança anual.', null)
on conflict (gym_id, name) do nothing;

insert into public.exercises (gym_id, name, muscle_group, equipment) values
  ('00000000-0000-4000-8000-000000000001', 'Supino reto com barra', 'peito', 'barra'),
  ('00000000-0000-4000-8000-000000000001', 'Supino inclinado com halteres', 'peito', 'halteres'),
  ('00000000-0000-4000-8000-000000000001', 'Crucifixo na máquina', 'peito', 'maquina'),
  ('00000000-0000-4000-8000-000000000001', 'Crossover na polia', 'peito', 'polia'),
  ('00000000-0000-4000-8000-000000000001', 'Flexão de braços', 'peito', 'peso_corporal'),
  ('00000000-0000-4000-8000-000000000001', 'Puxada frontal', 'costas', 'polia'),
  ('00000000-0000-4000-8000-000000000001', 'Remada curvada com barra', 'costas', 'barra'),
  ('00000000-0000-4000-8000-000000000001', 'Remada baixa', 'costas', 'polia'),
  ('00000000-0000-4000-8000-000000000001', 'Remada unilateral com halter', 'costas', 'halteres'),
  ('00000000-0000-4000-8000-000000000001', 'Barra fixa', 'costas', 'peso_corporal'),
  ('00000000-0000-4000-8000-000000000001', 'Desenvolvimento com halteres', 'ombros', 'halteres'),
  ('00000000-0000-4000-8000-000000000001', 'Elevação lateral', 'ombros', 'halteres'),
  ('00000000-0000-4000-8000-000000000001', 'Elevação frontal', 'ombros', 'halteres'),
  ('00000000-0000-4000-8000-000000000001', 'Crucifixo invertido', 'ombros', 'maquina'),
  ('00000000-0000-4000-8000-000000000001', 'Rosca direta', 'biceps', 'barra'),
  ('00000000-0000-4000-8000-000000000001', 'Rosca alternada', 'biceps', 'halteres'),
  ('00000000-0000-4000-8000-000000000001', 'Rosca martelo', 'biceps', 'halteres'),
  ('00000000-0000-4000-8000-000000000001', 'Tríceps na polia', 'triceps', 'polia'),
  ('00000000-0000-4000-8000-000000000001', 'Tríceps francês', 'triceps', 'halteres'),
  ('00000000-0000-4000-8000-000000000001', 'Mergulho no banco', 'triceps', 'banco'),
  ('00000000-0000-4000-8000-000000000001', 'Agachamento livre', 'quadriceps', 'barra'),
  ('00000000-0000-4000-8000-000000000001', 'Leg press 45°', 'quadriceps', 'maquina'),
  ('00000000-0000-4000-8000-000000000001', 'Cadeira extensora', 'quadriceps', 'maquina'),
  ('00000000-0000-4000-8000-000000000001', 'Afundo com halteres', 'quadriceps', 'halteres'),
  ('00000000-0000-4000-8000-000000000001', 'Mesa flexora', 'posteriores', 'maquina'),
  ('00000000-0000-4000-8000-000000000001', 'Stiff com barra', 'posteriores', 'barra'),
  ('00000000-0000-4000-8000-000000000001', 'Cadeira flexora', 'posteriores', 'maquina'),
  ('00000000-0000-4000-8000-000000000001', 'Elevação pélvica', 'gluteos', 'barra'),
  ('00000000-0000-4000-8000-000000000001', 'Cadeira abdutora', 'gluteos', 'maquina'),
  ('00000000-0000-4000-8000-000000000001', 'Glúteo na polia', 'gluteos', 'polia'),
  ('00000000-0000-4000-8000-000000000001', 'Panturrilha em pé', 'panturrilhas', 'maquina'),
  ('00000000-0000-4000-8000-000000000001', 'Panturrilha sentado', 'panturrilhas', 'maquina'),
  ('00000000-0000-4000-8000-000000000001', 'Abdominal supra', 'abdomen', 'peso_corporal'),
  ('00000000-0000-4000-8000-000000000001', 'Prancha isométrica', 'abdomen', 'peso_corporal'),
  ('00000000-0000-4000-8000-000000000001', 'Abdominal na polia', 'abdomen', 'polia'),
  ('00000000-0000-4000-8000-000000000001', 'Kettlebell swing', 'corpo_inteiro', 'kettlebell'),
  ('00000000-0000-4000-8000-000000000001', 'Burpee', 'corpo_inteiro', 'peso_corporal'),
  ('00000000-0000-4000-8000-000000000001', 'Esteira', 'cardio', 'esteira'),
  ('00000000-0000-4000-8000-000000000001', 'Bicicleta ergométrica', 'cardio', 'bicicleta'),
  ('00000000-0000-4000-8000-000000000001', 'Mobilidade de quadril', 'mobilidade', 'peso_corporal')
on conflict (gym_id, name) do nothing;
