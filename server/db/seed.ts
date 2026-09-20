import bcrypt from 'bcryptjs';
import { query, queryOne } from './index.ts';

export async function seedDatabase(force: boolean = false) {
  const existingUsers = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users');
  if (existingUsers && parseInt(existingUsers.count, 10) > 0 && !force) {
    return;
  }
  if (force) {
    await query('DELETE FROM notifications');
    await query('DELETE FROM activity_logs');
    await query('DELETE FROM tasks');
    await query('DELETE FROM projects');
    await query('DELETE FROM clients');
    await query('DELETE FROM refresh_tokens');
    await query('DELETE FROM users');
  }

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('admin123', salt);
  const pmHash = await bcrypt.hash('pm123', salt);
  const devHash = await bcrypt.hash('dev123', salt);

  const users = [
    {
      id: 'usr_admin_1',
      email: 'admin@agency.com',
      password_hash: adminHash,
      full_name: 'Alexander Hayes',
      role: 'ADMIN',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  {
      id: 'usr_admin_2',
      email: 'mskmohan50@gmail.com',
      password_hash: 'mskmohan',
      full_name: 'Mohan Raj G',
      role: 'ADMIN',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    {
      id: 'usr_pm_ravi',
      email: 'ravi@agency.com',
      password_hash: pmHash,
      full_name: 'Ravi Sharma',
      role: 'PROJECT_MANAGER',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      id: 'usr_pm_elena',
      email: 'elena@agency.com',
      password_hash: pmHash,
      full_name: 'Elena Rostova',
      role: 'PROJECT_MANAGER',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    },
    {
      id: 'usr_dev_alex',
      email: 'alex@agency.com',
      password_hash: devHash,
      full_name: 'Alex Rivera',
      role: 'DEVELOPER',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
    {
      id: 'usr_dev_sarah',
      email: 'sarah@agency.com',
      password_hash: devHash,
      full_name: 'Sarah Chen',
      role: 'DEVELOPER',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    {
      id: 'usr_dev_marcus',
      email: 'marcus@agency.com',
      password_hash: devHash,
      full_name: 'Marcus Vance',
      role: 'DEVELOPER',
      avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    },
    {
      id: 'usr_dev_priya',
      email: 'priya@agency.com',
      password_hash: devHash,
      full_name: 'Priya Patel',
      role: 'DEVELOPER',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    },
  ];

  for (const u of users) {
    await query(
      `INSERT INTO users (id, email, password_hash, full_name, role, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.email, u.password_hash, u.full_name, u.role, u.avatar_url]
    );
  }

  const clients = [
    {
      id: 'client_apex',
      name: 'Apex Financial Technologies',
      company: 'Apex Holdings International',
      email: 'contact@apexfinancial.com',
      phone: '+1 (555) 234-5678',
    },
    {
      id: 'client_nordic',
      name: 'Nordic Goods Co.',
      company: 'Nordic Retail Group Nordic AB',
      email: 'partnerships@nordicgoods.se',
      phone: '+46 8 123 4567',
    },
    {
      id: 'client_biosync',
      name: 'BioSync Health Innovations',
      company: 'BioSync Therapeutics LLC',
      email: 'security@biosynchealth.io',
      phone: '+1 (415) 890-1234',
    },
  ];

  for (const c of clients) {
    await query(
      `INSERT INTO clients (id, name, company, email, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.name, c.company, c.email, c.phone]
    );
  }
  const projects = [
    {
      id: 'proj_fintech',
      title: 'Fintech Mobile Banking Replatform',
      description: 'Next-generation biometric auth, micro-investing portfolio, and real-time transaction streaming backend.',
      client_id: 'client_apex',
      created_by: 'usr_pm_ravi',
      status: 'ACTIVE',
    },
    {
      id: 'proj_ecommerce',
      title: 'Omnichannel E-Commerce Headless Storefront',
      description: 'Next.js 15 headless storefront with global multi-currency checkout, warehouse inventory sync, and Algolia search.',
      client_id: 'client_nordic',
      created_by: 'usr_pm_ravi',
      status: 'ACTIVE',
    },
    {
      id: 'proj_telemed',
      title: 'HealthTech AI Telemedicine Portal',
      description: 'HIPAA-compliant WebRTC encrypted video consultations, clinical AI transcription, and EHR integration.',
      client_id: 'client_biosync',
      created_by: 'usr_pm_elena',
      status: 'ACTIVE',
    },
  ];

  for (const p of projects) {
    await query(
      `INSERT INTO projects (id, title, description, client_id, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.title, p.description, p.client_id, p.created_by, p.status]
    );
  }
  const now = new Date();
  const past4Days = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const past2Days = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const future2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const future4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
  const future7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const future14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const tasks = [
    {
      id: 'task_ft_1',
      project_id: 'proj_fintech',
      title: 'Implement Plaid OAuth Bank Account Linking',
      description: 'Configure webhooks for balance updates and end-to-end token exchange with AES-256 encrypted storage.',
      assigned_to: 'usr_dev_alex',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      due_date: past4Days,
      is_overdue: true, 
    },
    {
      id: 'task_ft_2',
      project_id: 'proj_fintech',
      title: 'Biometric FaceID / TouchID Authentication Native Bridge',
      description: 'Implement secure hardware enclave key generation and fallback passcode handling.',
      assigned_to: 'usr_dev_alex',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      due_date: future2Days,
      is_overdue: false,
    },
    {
      id: 'task_ft_3',
      project_id: 'proj_fintech',
      title: 'Real-time WebSocket Ledger Transaction Streaming',
      description: 'Build low-latency push notification pipeline for ledger debits and instant fraud velocity checks.',
      assigned_to: 'usr_dev_sarah',
      status: 'TODO',
      priority: 'HIGH',
      due_date: future4Days,
      is_overdue: false,
    },
    {
      id: 'task_ft_4',
      project_id: 'proj_fintech',
      title: 'Micro-investing Round-Up Math Verification Test Suite',
      description: 'Unit and property tests ensuring cent truncation precision and ledger balance parity.',
      assigned_to: 'usr_dev_marcus',
      status: 'DONE',
      priority: 'MEDIUM',
      due_date: future7Days,
      is_overdue: false,
    },
    {
      id: 'task_ft_5',
      project_id: 'proj_fintech',
      title: 'KYC Document Verification AWS Textract Pipeline',
      description: 'Automated OCR extraction and sanctions watchlist check with manual review escalation flags.',
      assigned_to: 'usr_dev_alex',
      status: 'TODO',
      priority: 'MEDIUM',
      due_date: future14Days,
      is_overdue: false,
    },
    {
      id: 'task_ft_6',
      project_id: 'proj_fintech',
      title: 'Export Tax Year-End CSV / PDF Generation Engine',
      description: 'Generate formatted 1099-B dividend and capital gains summaries for customer account portals.',
      assigned_to: 'usr_dev_sarah',
      status: 'TODO',
      priority: 'LOW',
      due_date: future14Days,
      is_overdue: false,
    },
    {
      id: 'task_ec_1',
      project_id: 'proj_ecommerce',
      title: 'Stripe Multi-Currency Payment Engine & 3D Secure 2',
      description: 'Support EUR, SEK, GBP, and USD with dynamic localized currency conversion and VAT calculation.',
      assigned_to: 'usr_dev_sarah',
      status: 'TODO',
      priority: 'CRITICAL',
      due_date: past2Days,
      is_overdue: true,
    },
    {
      id: 'task_ec_2',
      project_id: 'proj_ecommerce',
      title: 'Algolia InstantSearch Multi-Facet Product Filtering',
      description: 'Sub-50ms search with color, size, price range facets and synonyms dictionary.',
      assigned_to: 'usr_dev_sarah',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      due_date: future2Days,
      is_overdue: false,
    },
    {
      id: 'task_ec_3',
      project_id: 'proj_ecommerce',
      title: 'Warehouse Real-Time Inventory Sync Webhook Listener',
      description: 'Debounced stock adjustment queues to prevent overselling during flash drop sales.',
      assigned_to: 'usr_dev_alex',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      due_date: future4Days,
      is_overdue: false,
    },
    {
      id: 'task_ec_4',
      project_id: 'proj_ecommerce',
      title: 'Cart Abandonment Automated Email Recovery Trigger',
      description: 'Scheduled Redis queue sending personalized reminder discount links 2 hours post-abandonment.',
      assigned_to: 'usr_dev_marcus',
      status: 'DONE',
      priority: 'MEDIUM',
      due_date: future7Days,
      is_overdue: false,
    },
    {
      id: 'task_ec_5',
      project_id: 'proj_ecommerce',
      title: 'Lighthouse Core Web Vitals 95+ Optimization',
      description: 'Image AVIF transcode pipeline, critical CSS inlining, and lazy-loading below-the-fold carousel assets.',
      assigned_to: 'usr_dev_sarah',
      status: 'TODO',
      priority: 'LOW',
      due_date: future14Days,
      is_overdue: false,
    },
    {
      id: 'task_tm_1',
      project_id: 'proj_telemed',
      title: 'HIPAA-Compliant WebRTC P2P Video Call Mesh Room',
      description: 'STUN/TURN server configuration with fallback relay and AES-GCM session media encryption.',
      assigned_to: 'usr_dev_priya',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      due_date: future2Days,
      is_overdue: false,
    },
    {
      id: 'task_tm_2',
      project_id: 'proj_telemed',
      title: 'Clinical Encounter AI Transcription and SOAP Notes',
      description: 'Audio chunk streaming to Gemini medical audio models for draft prescription and diagnosis summary.',
      assigned_to: 'usr_dev_priya',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      due_date: future4Days,
      is_overdue: false,
    },
    {
      id: 'task_tm_3',
      project_id: 'proj_telemed',
      title: 'FHIR HL7 Electronic Health Record Patient Sync',
      description: 'Standardized JSON resource serialization against Epic and Cerner EHR sandbox endpoints.',
      assigned_to: 'usr_dev_marcus',
      status: 'TODO',
      priority: 'HIGH',
      due_date: future7Days,
      is_overdue: false,
    },
    {
      id: 'task_tm_4',
      project_id: 'proj_telemed',
      title: 'Doctor Schedule Availability & Calendar Slot Lock',
      description: 'Timezone-aware scheduling matrix with optimistic locking to prevent double booking.',
      assigned_to: 'usr_dev_priya',
      status: 'DONE',
      priority: 'MEDIUM',
      due_date: future7Days,
      is_overdue: false,
    },
    {
      id: 'task_tm_5',
      project_id: 'proj_telemed',
      title: 'E-Prescription Surescripts Network Integration',
      description: 'Formulary lookup and pharmacy transmission validation with DEA schedule checks.',
      assigned_to: 'usr_dev_marcus',
      status: 'TODO',
      priority: 'MEDIUM',
      due_date: future14Days,
      is_overdue: false,
    },
    {
      id: 'task_tm_6',
      project_id: 'proj_telemed',
      title: 'Patient Portal Medical History Questionnaire',
      description: 'Multi-step dynamic form capturing allergies, current medications, and past surgical history.',
      assigned_to: 'usr_dev_priya',
      status: 'TODO',
      priority: 'LOW',
      due_date: future14Days,
      is_overdue: false,
    },
  ];

  for (const t of tasks) {
    await query(
      `INSERT INTO tasks (id, project_id, title, description, assigned_to, status, priority, due_date, is_overdue)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [t.id, t.project_id, t.title, t.description, t.assigned_to, t.status, t.priority, t.due_date, t.is_overdue]
    );
  }
  const activityLogs = [
    {
      id: 'act_1',
      task_id: 'task_ft_2',
      project_id: 'proj_fintech',
      user_id: 'usr_dev_alex',
      action_type: 'STATUS_CHANGE',
      previous_status: 'IN_PROGRESS',
      new_status: 'IN_REVIEW',
      message: 'Alex Rivera moved Biometric FaceID / TouchID from In Progress → In Review',
      created_at: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: 'act_2',
      task_id: 'task_ft_4',
      project_id: 'proj_fintech',
      user_id: 'usr_pm_ravi',
      action_type: 'STATUS_CHANGE',
      previous_status: 'IN_REVIEW',
      new_status: 'DONE',
      message: 'Ravi Sharma approved Micro-investing Round-Up Math from In Review → Done',
      created_at: new Date(now.getTime() - 55 * 60 * 1000).toISOString(),
    },
    {
      id: 'act_3',
      task_id: 'task_ec_3',
      project_id: 'proj_ecommerce',
      user_id: 'usr_dev_alex',
      action_type: 'STATUS_CHANGE',
      previous_status: 'IN_PROGRESS',
      new_status: 'IN_REVIEW',
      message: 'Alex Rivera moved Warehouse Inventory Sync from In Progress → In Review',
      created_at: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
    },
    {
      id: 'act_4',
      task_id: 'task_ec_4',
      project_id: 'proj_ecommerce',
      user_id: 'usr_pm_ravi',
      action_type: 'STATUS_CHANGE',
      previous_status: 'IN_REVIEW',
      new_status: 'DONE',
      message: 'Ravi Sharma approved Cart Abandonment Recovery from In Review → Done',
      created_at: new Date(now.getTime() - 140 * 60 * 1000).toISOString(),
    },
    {
      id: 'act_5',
      task_id: 'task_tm_2',
      project_id: 'proj_telemed',
      user_id: 'usr_dev_priya',
      action_type: 'STATUS_CHANGE',
      previous_status: 'IN_PROGRESS',
      new_status: 'IN_REVIEW',
      message: 'Priya Patel moved Clinical Encounter AI Transcription from In Progress → In Review',
      created_at: new Date(now.getTime() - 180 * 60 * 1000).toISOString(),
    },
    {
      id: 'act_6',
      task_id: 'task_tm_4',
      project_id: 'proj_telemed',
      user_id: 'usr_pm_elena',
      action_type: 'STATUS_CHANGE',
      previous_status: 'IN_REVIEW',
      new_status: 'DONE',
      message: 'Elena Rostova approved Doctor Schedule Availability from In Review → Done',
      created_at: new Date(now.getTime() - 240 * 60 * 1000).toISOString(),
    },
    {
      id: 'act_7',
      task_id: 'task_ft_1',
      project_id: 'proj_fintech',
      user_id: 'usr_pm_ravi',
      action_type: 'TASK_ASSIGNED',
      previous_status: null,
      new_status: 'IN_PROGRESS',
      message: 'Ravi Sharma assigned Plaid OAuth Bank Account Linking to Alex Rivera',
      created_at: new Date(now.getTime() - 360 * 60 * 1000).toISOString(),
    },
    {
      id: 'act_8',
      task_id: 'task_ec_1',
      project_id: 'proj_ecommerce',
      user_id: 'usr_pm_ravi',
      action_type: 'TASK_ASSIGNED',
      previous_status: null,
      new_status: 'TODO',
      message: 'Ravi Sharma assigned Stripe Multi-Currency Payment Engine to Sarah Chen',
      created_at: new Date(now.getTime() - 480 * 60 * 1000).toISOString(),
    },
    {
      id: 'act_9',
      task_id: 'task_ft_1',
      project_id: 'proj_fintech',
      user_id: 'usr_admin_1',
      action_type: 'FLAGGED_OVERDUE',
      previous_status: 'IN_PROGRESS',
      new_status: 'IN_PROGRESS',
      message: 'System Scheduler automatically flagged Plaid OAuth Bank Account Linking as Overdue',
      created_at: new Date(now.getTime() - 600 * 60 * 1000).toISOString(),
    },
    {
      id: 'act_10',
      task_id: 'task_ec_1',
      project_id: 'proj_ecommerce',
      user_id: 'usr_admin_1',
      action_type: 'FLAGGED_OVERDUE',
      previous_status: 'TODO',
      new_status: 'TODO',
      message: 'System Scheduler automatically flagged Stripe Multi-Currency Payment Engine as Overdue',
      created_at: new Date(now.getTime() - 720 * 60 * 1000).toISOString(),
    },
  ];

  for (const a of activityLogs) {
    await query(
      `INSERT INTO activity_logs (id, task_id, project_id, user_id, action_type, previous_status, new_status, message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.task_id, a.project_id, a.user_id, a.action_type, a.previous_status, a.new_status, a.message, a.created_at]
    );
  }

  // 6. Seed Notifications
  const notifications = [
    {
      id: 'notif_1',
      user_id: 'usr_pm_ravi',
      title: 'Task Ready for Review',
      message: 'Alex Rivera moved "Biometric FaceID / TouchID" to In Review.',
      task_id: 'task_ft_2',
      project_id: 'proj_fintech',
      is_read: false,
      created_at: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: 'notif_2',
      user_id: 'usr_dev_alex',
      title: 'Task Assigned',
      message: 'Ravi Sharma assigned you "Plaid OAuth Bank Account Linking".',
      task_id: 'task_ft_1',
      project_id: 'proj_fintech',
      is_read: false,
      created_at: new Date(now.getTime() - 360 * 60 * 1000).toISOString(),
    },
    {
      id: 'notif_3',
      user_id: 'usr_dev_alex',
      title: 'Task Overdue Alert',
      message: 'Task "Plaid OAuth Bank Account Linking" is now overdue.',
      task_id: 'task_ft_1',
      project_id: 'proj_fintech',
      is_read: false,
      created_at: new Date(now.getTime() - 600 * 60 * 1000).toISOString(),
    },
    {
      id: 'notif_4',
      user_id: 'usr_pm_elena',
      title: 'Task Ready for Review',
      message: 'Priya Patel moved "Clinical Encounter AI Transcription" to In Review.',
      task_id: 'task_tm_2',
      project_id: 'proj_telemed',
      is_read: false,
      created_at: new Date(now.getTime() - 180 * 60 * 1000).toISOString(),
    },
  ];

  for (const n of notifications) {
    await query(
      `INSERT INTO notifications (id, user_id, title, message, task_id, project_id, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [n.id, n.user_id, n.title, n.message, n.task_id, n.project_id, n.is_read, n.created_at]
    );
  }

  console.log('Database seeded successfully with initial assessment data.');
}
