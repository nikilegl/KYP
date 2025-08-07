/*
  # Create User Journey Tables

  1. New Tables
    - `user_journeys`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_journey_nodes`
      - `id` (uuid, primary key)
      - `user_journey_id` (uuid, foreign key to user_journeys)
      - `type` (text, 'task' or 'question')
      - `description` (text)
      - `parent_node_id` (uuid, foreign key to user_journey_nodes, nullable)
      - `parent_answer` (text, nullable)
      - `pain_point` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_journey_stakeholders`
      - `id` (uuid, primary key)
      - `user_journey_id` (uuid, foreign key to user_journeys)
      - `stakeholder_id` (uuid, foreign key to stakeholders)
      - `created_at` (timestamp)
    
    - `user_journey_node_answers`
      - `id` (uuid, primary key)
      - `node_id` (uuid, foreign key to user_journey_nodes)
      - `answer_text` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data

  3. Indexes
    - Add indexes for foreign keys and commonly queried fields
*/

-- Create user_journeys table
CREATE TABLE IF NOT EXISTS user_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_journey_nodes table
CREATE TABLE IF NOT EXISTS user_journey_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_journey_id uuid NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('task', 'question')),
  description text NOT NULL,
  parent_node_id uuid REFERENCES user_journey_nodes(id) ON DELETE CASCADE,
  parent_answer text,
  pain_point text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_journey_stakeholders table
CREATE TABLE IF NOT EXISTS user_journey_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_journey_id uuid NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_journey_id, stakeholder_id)
);

-- Create user_journey_node_answers table
CREATE TABLE IF NOT EXISTS user_journey_node_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES user_journey_nodes(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_journeys_project_id ON user_journeys(project_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_nodes_journey_id ON user_journey_nodes(user_journey_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_nodes_parent_id ON user_journey_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_stakeholders_journey_id ON user_journey_stakeholders(user_journey_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_stakeholders_stakeholder_id ON user_journey_stakeholders(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_node_answers_node_id ON user_journey_node_answers(node_id);

-- Enable Row Level Security
ALTER TABLE user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey_node_answers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_journeys
CREATE POLICY "Allow authenticated users to manage user journeys"
  ON user_journeys
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for user_journey_nodes
CREATE POLICY "Allow authenticated users to manage user journey nodes"
  ON user_journey_nodes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for user_journey_stakeholders
CREATE POLICY "Allow authenticated users to manage user journey stakeholders"
  ON user_journey_stakeholders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for user_journey_node_answers
CREATE POLICY "Allow authenticated users to manage user journey node answers"
  ON user_journey_node_answers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);