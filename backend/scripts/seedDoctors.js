const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Symptom = require('../models/Symptom');
const Slot = require('../models/Slot');
const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const connectDB = require('../config/db');

const seedData = async () => {
  try {
    console.log('🌱 Connecting to database...');
    await connectDB();

    console.log('🧹 Clearing existing seed data...');
    await User.deleteMany({ email: { $in: [/doctorp\.com$/i, /example\.com$/i] } });
    await DoctorProfile.deleteMany({});
    await Symptom.deleteMany({});
    await Slot.deleteMany({});
    await Review.deleteMany({});
    await Appointment.deleteMany({});

    console.log('👤 Creating default users (Admin, Doctor, Patient)...');

    // 1. Admin user
    const adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@doctorp.com',
      password: process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123',
      role: 'admin',
      phone: '+91 98765 43210',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    });

    // 2. Demo Patient user
    const patientUser = await User.create({
      name: 'Rahul Sharma',
      email: 'patient@doctorp.com',
      password: 'Patient@123',
      role: 'patient',
      phone: '+91 91234 56789',
      gender: 'Male',
      age: 28,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    });

    // 3. 12 Highly Realistic Doctors across top hospitals in India & Metro cities
    const doctorsList = [
      {
        email: 'dr.sharma@doctorp.com',
        name: 'Dr. Rajesh Sharma',
        specialization: 'Cardiology',
        medicalRegNumber: 'DMC-24819-A',
        qualifications: ['MBBS (AIIMS New Delhi)', 'MD (Internal Medicine)', 'DM (Cardiology - AIIMS)', 'FACC (USA)'],
        experience: 18,
        consultationFee: 850,
        clinicName: 'Max Super Speciality Hospital',
        location: {
          address: '1, 2, Press Enclave Marg, Saket',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110017',
          coordinates: { lat: 28.5284, lng: 77.2185 },
        },
        languages: ['English', 'Hindi', 'Punjabi'],
        consultationModes: ['In-Clinic Visit', 'Video Consultation'],
        bio: 'Dr. Rajesh Sharma is a Senior Interventional Cardiologist at Max Super Speciality Hospital with over 18 years of clinical leadership. He has performed over 4,500 complex coronary angioplasties and specializes in coronary artery disease, preventative cardiovascular therapeutics, and cardiac arrhythmia management.',
        awards: ['Healthcare Leader of the Year 2024 (IMA)', 'Best Interventional Cardiologist Award - North India'],
        profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
        rating: 4.9,
        totalReviews: 86,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        timeSlots: ['09:00', '10:00', '11:00', '12:00', '14:30', '15:30', '16:30', '17:30'],
      },
      {
        email: 'dr.priya@doctorp.com',
        name: 'Dr. Priya Patel',
        specialization: 'Dermatology',
        medicalRegNumber: 'MMC-68491-B',
        qualifications: ['MBBS (KEM Hospital)', 'MD (Dermatology, Venereology & Leprosy)', 'Fellowship in Dermatosurgery (UK)'],
        experience: 12,
        consultationFee: 700,
        clinicName: 'Kokilaben Dhirubhai Ambani Hospital',
        location: {
          address: 'Rao Saheb, Achutrao Patwardhan Marg, Four Bungalows, Andheri West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400053',
          coordinates: { lat: 19.1314, lng: 72.8258 },
        },
        languages: ['English', 'Hindi', 'Gujarati', 'Marathi'],
        consultationModes: ['In-Clinic Visit', 'Video Consultation'],
        bio: 'Dr. Priya Patel is a prominent Consultant Dermatologist & Aesthetic Laser Specialist. She specializes in severe recalcitrant acne therapies, psoriasis, eczema, pediatric dermatology, and non-surgical facial rejuvenation.',
        awards: ['National Youth Dermatologist Award 2022', 'Gold Medalist - MD Dermatology'],
        profileImage: 'https://images.unsplash.com/photo-1594824813511-0967e8913697?auto=format&fit=crop&w=400&q=80',
        rating: 4.8,
        totalReviews: 64,
        availableDays: ['Monday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        timeSlots: ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
      },
      {
        email: 'dr.aravind@doctorp.com',
        name: 'Dr. Aravind Menon',
        specialization: 'Neurology',
        medicalRegNumber: 'KMC-39102-C',
        qualifications: ['MBBS (Bangalore Medical College)', 'MD (Medicine)', 'DM (Neurology - NIMHANS)', 'FRCP (Edinburgh)'],
        experience: 22,
        consultationFee: 1100,
        clinicName: 'Manipal Hospital',
        location: {
          address: '98, HAL Old Airport Rd, Kodihalli',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560017',
          coordinates: { lat: 12.9592, lng: 77.6499 },
        },
        languages: ['English', 'Hindi', 'Kannada', 'Malayalam'],
        consultationModes: ['In-Clinic Visit', 'Video Consultation'],
        bio: 'Dr. Aravind Menon trained at the prestigious National Institute of Mental Health and Neurosciences (NIMHANS). With 22 years of experience, he is recognized for his clinical mastery in stroke rehabilitation, complex refractory migraines, epilepsy, and movement disorders.',
        awards: ['NIMHANS Best Research Fellow Award', 'Distinguished Clinical Neurologist Lifetime Award'],
        profileImage: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80',
        rating: 4.9,
        totalReviews: 112,
        availableDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        timeSlots: ['09:30', '10:30', '11:30', '14:00', '15:00', '16:00'],
      },
      {
        email: 'dr.ananya@doctorp.com',
        name: 'Dr. Ananya Roy',
        specialization: 'Pediatrics',
        medicalRegNumber: 'WBMC-59201-D',
        qualifications: ['MBBS (Calcutta Medical College)', 'DCH (Child Health)', 'MD (Pediatrics)', 'Fellow in Neonatology'],
        experience: 11,
        consultationFee: 600,
        clinicName: 'Apollo Gleneagles Hospital',
        location: {
          address: '58, Canal Circular Rd, Kadapara, Phool Bagan',
          city: 'Kolkata',
          state: 'West Bengal',
          pincode: '700054',
          coordinates: { lat: 22.5726, lng: 88.4067 },
        },
        languages: ['English', 'Hindi', 'Bengali'],
        consultationModes: ['In-Clinic Visit', 'Video Consultation'],
        bio: 'Dr. Ananya Roy is a compassionate pediatrician dedicated to newborn intensive care, childhood developmental milestones, nutrition, and pediatric preventative immunizations.',
        awards: ['Excellence in Neonatal Care 2023', 'Best Child Care Clinician'],
        profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
        rating: 4.9,
        totalReviews: 78,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        timeSlots: ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00'],
      },
      {
        email: 'dr.vikram@doctorp.com',
        name: 'Dr. Vikram Malhotra',
        specialization: 'Orthopedics',
        medicalRegNumber: 'HN-89201-E',
        qualifications: ['MBBS (MAMC Delhi)', 'MS (Orthopedics - Safdarjung)', 'MCh (Orth - UK)', 'Fellow in Joint Reconstruction (Germany)'],
        experience: 16,
        consultationFee: 850,
        clinicName: 'Medanta — The Medicity',
        location: {
          address: 'CH Bakhtawar Singh Rd, Sector 38',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122001',
          coordinates: { lat: 28.4395, lng: 77.0425 },
        },
        languages: ['English', 'Hindi', 'Punjabi'],
        consultationModes: ['In-Clinic Visit'],
        bio: 'Dr. Vikram Malhotra is an internationally fellowship-trained orthopedic surgeon specializing in robotic total knee and hip replacements, sports arthroscopy, ACL reconstruction, and complex trauma.',
        awards: ['Medanta Clinical Pioneer 2024', 'Best Sports Injury Specialist'],
        profileImage: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80',
        rating: 4.8,
        totalReviews: 92,
        availableDays: ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'],
        timeSlots: ['10:00', '11:00', '12:00', '14:30', '15:30', '16:30'],
      },
      {
        email: 'dr.sunita@doctorp.com',
        name: 'Dr. Sunita Verma',
        specialization: 'General Medicine',
        medicalRegNumber: 'DMC-49281-F',
        qualifications: ['MBBS (Lady Hardinge Medical College)', 'MD (Internal Medicine - Delhi University)'],
        experience: 15,
        consultationFee: 500,
        clinicName: 'Sir Ganga Ram Hospital',
        location: {
          address: 'Rajinder Nagar',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110060',
          coordinates: { lat: 28.6389, lng: 77.1896 },
        },
        languages: ['English', 'Hindi'],
        consultationModes: ['In-Clinic Visit', 'Video Consultation'],
        bio: 'Dr. Sunita Verma is an empathetic physician focusing on primary preventative medicine, chronic condition management (Type-2 Diabetes, Hypertension, Thyroid disorders), and complex fever evaluations.',
        awards: ['IMA Outstanding Physician Award', 'Community Health Champion'],
        profileImage: 'https://images.unsplash.com/photo-1594824813511-0967e8913697?auto=format&fit=crop&w=400&q=80',
        rating: 4.9,
        totalReviews: 120,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        timeSlots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
      },
      {
        email: 'dr.kavita@doctorp.com',
        name: 'Dr. Kavita Nair',
        specialization: 'Cardiology',
        medicalRegNumber: 'TNMC-48201-G',
        qualifications: ['MBBS (Madras Medical College)', 'MD (General Medicine)', 'DM (Cardiology - Stanley)'],
        experience: 14,
        consultationFee: 800,
        clinicName: 'Apollo Main Hospital',
        location: {
          address: '21 Greams Lane, Thousand Lights',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600006',
          coordinates: { lat: 13.0604, lng: 80.2496 },
        },
        languages: ['English', 'Tamil', 'Hindi', 'Malayalam'],
        consultationModes: ['In-Clinic Visit', 'Video Consultation'],
        bio: 'Dr. Kavita Nair is a consultant cardiologist specializing in non-invasive cardiac imaging, transesophageal echocardiography, heart failure management, and women’s cardiovascular health.',
        awards: ['Cardiology Society of India Research Gold Medal'],
        profileImage: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&w=400&q=80',
        rating: 4.9,
        totalReviews: 53,
        availableDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
        timeSlots: ['09:30', '10:30', '11:30', '14:00', '15:00', '16:00'],
      },
      {
        email: 'dr.manish@doctorp.com',
        name: 'Dr. Manish Kapoor',
        specialization: 'Dermatology',
        medicalRegNumber: 'TSMC-39184-H',
        qualifications: ['MBBS (Osmania)', 'MD (Dermatology)', 'Fellowship in Trichology & Hair Transplant'],
        experience: 10,
        consultationFee: 650,
        clinicName: 'Apollo Health City',
        location: {
          address: 'Road No 72, Film Nagar, Jubilee Hills',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500033',
          coordinates: { lat: 17.4168, lng: 78.4121 },
        },
        languages: ['English', 'Hindi', 'Telugu'],
        consultationModes: ['In-Clinic Visit', 'Video Consultation'],
        bio: 'Dr. Manish Kapoor is an acclaimed dermatologist with expertise in treating chronic eczema, vitiligo, hair loss disorders, and phototherapy therapies.',
        awards: ['Best Dermatologist in Hyderabad 2023'],
        profileImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
        rating: 4.7,
        totalReviews: 44,
        availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
        timeSlots: ['11:00', '12:00', '14:30', '15:30', '16:30', '17:30'],
      },
      {
        email: 'dr.neha@doctorp.com',
        name: 'Dr. Neha Saxena',
        specialization: 'Neurology',
        medicalRegNumber: 'DMC-91024-I',
        qualifications: ['MBBS', 'MD (Medicine)', 'DM (Neurology - GB Pant)'],
        experience: 13,
        consultationFee: 950,
        clinicName: 'Fortis Memorial Research Institute',
        location: {
          address: 'Sector 44, Opposite HUDA City Centre',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122002',
          coordinates: { lat: 28.4595, lng: 77.0725 },
        },
        languages: ['English', 'Hindi'],
        consultationModes: ['In-Clinic Visit', 'Video Consultation'],
        bio: 'Dr. Neha Saxena is a senior neurologist with expertise in Parkinson’s disease, tremor management, multiple sclerosis, and nerve conduction studies.',
        awards: ['Fortis Star Clinician 2023'],
        profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
        rating: 4.9,
        totalReviews: 38,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Friday'],
        timeSlots: ['10:00', '11:00', '12:00', '14:00', '15:00'],
      },
      {
        email: 'dr.amit@doctorp.com',
        name: 'Dr. Amit Joshi',
        specialization: 'Orthopedics',
        medicalRegNumber: 'MMC-72910-J',
        qualifications: ['MBBS (Grant Medical College)', 'MS (Orthopedics)', 'Fellowship in Spine Surgery (USA)'],
        experience: 17,
        consultationFee: 900,
        clinicName: 'Nanavati Max Super Speciality Hospital',
        location: {
          address: 'SV Rd, near LIC Colony, Vile Parle West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400056',
          coordinates: { lat: 19.0988, lng: 72.8427 },
        },
        languages: ['English', 'Hindi', 'Marathi'],
        consultationModes: ['In-Clinic Visit'],
        bio: 'Dr. Amit Joshi is a senior spine surgeon specializing in minimally invasive spine surgery, disc replacement, sciatica, and cervical spine therapies.',
        awards: ['National Spine Surgery Excellence Award'],
        profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
        rating: 4.8,
        totalReviews: 76,
        availableDays: ['Tuesday', 'Thursday', 'Friday', 'Saturday'],
        timeSlots: ['10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
      },
      {
        email: 'dr.rohit@doctorp.com',
        name: 'Dr. Rohit Singhal',
        specialization: 'Pediatrics',
        medicalRegNumber: 'KMC-84920-K',
        qualifications: ['MBBS', 'MD (Pediatrics - PGI Chandigarh)', 'Fellowship in Pediatric Allergy & Pulmonology'],
        experience: 14,
        consultationFee: 650,
        clinicName: 'Aster CMI Hospital',
        location: {
          address: 'No. 43/42, NH 44, Sahakar Nagar',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560092',
          coordinates: { lat: 13.0567, lng: 77.5898 },
        },
        languages: ['English', 'Hindi', 'Kannada'],
        consultationModes: ['In-Clinic Visit', 'Video Consultation'],
        bio: 'Specialist in pediatric asthma, allergic rhinitis, childhood immunizations, and chronic respiratory disorders in infants and adolescents.',
        awards: ['PGI Chandigarh Academic Gold Medalist'],
        profileImage: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80',
        rating: 4.9,
        totalReviews: 59,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
        timeSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
      },
      {
        email: 'dr.meenakshi@doctorp.com',
        name: 'Dr. Meenakshi Sundaram',
        specialization: 'General Medicine',
        medicalRegNumber: 'TNMC-90214-L',
        qualifications: ['MBBS (Madras Medical College)', 'MD (Internal Medicine)'],
        experience: 19,
        consultationFee: 550,
        clinicName: 'Fortis Malar Hospital',
        location: {
          address: 'No. 52, 1st Main Rd, Gandhi Nagar, Adyar',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600020',
          coordinates: { lat: 13.0067, lng: 80.2571 },
        },
        languages: ['English', 'Tamil', 'Telugu'],
        consultationModes: ['In-Clinic Visit', 'Video Consultation'],
        bio: 'Experienced senior physician providing comprehensive adult medical consultations, lifestyle disease reversal programs, and geriatric healthcare.',
        awards: ['Lifetime Dedication to Primary Medicine (Chennai)'],
        profileImage: 'https://images.unsplash.com/photo-1594824813511-0967e8913697?auto=format&fit=crop&w=400&q=80',
        rating: 4.9,
        totalReviews: 83,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        timeSlots: ['09:00', '10:00', '11:00', '12:00', '15:00', '16:00', '17:00'],
      },
    ];

    console.log(`👨‍⚕️ Seeding ${doctorsList.length} verified hospital specialists...`);
    for (const doc of doctorsList) {
      const user = await User.create({
        name: doc.name,
        email: doc.email,
        password: 'Doctor@123',
        role: 'doctor',
        phone: '+91 98111 22334',
        status: 'active',
        avatar: doc.profileImage,
      });

      const doctorProfile = await DoctorProfile.create({
        userId: user._id,
        name: doc.name,
        specialization: doc.specialization,
        medicalRegNumber: doc.medicalRegNumber,
        qualifications: doc.qualifications,
        experience: doc.experience,
        consultationFee: doc.consultationFee,
        clinicName: doc.clinicName,
        location: doc.location,
        languages: doc.languages,
        consultationModes: doc.consultationModes,
        bio: doc.bio,
        awards: doc.awards,
        profileImage: doc.profileImage,
        approvalStatus: 'approved',
        isVerified: true,
        isAvailableToday: true,
        rating: doc.rating,
        totalReviews: doc.totalReviews,
        availableDays: doc.availableDays,
        timeSlots: doc.timeSlots,
        slotDuration: 30,
      });

      // Seed realistic slots for today and next 5 days
      for (let dayOffset = 0; dayOffset <= 4; dayOffset++) {
        const slotDate = new Date();
        slotDate.setDate(slotDate.getDate() + dayOffset);
        const dateStr = slotDate.toISOString().slice(0, 10);

        for (const t of doc.timeSlots.slice(0, 4)) {
          await Slot.create({
            doctorId: doctorProfile._id,
            date: dateStr,
            time: t,
            status: 'available',
          });
        }
      }
    }

    console.log('🤖 Seeding comprehensive AI Symptom taxonomy...');
    const symptomsData = [
      {
        keywords: ['chest pain', 'heart palpitations', 'shortness of breath', 'high blood pressure', 'left arm pain', 'tight chest', 'fluttering heart', 'angina'],
        specialty: 'Cardiology',
        description: 'Your symptoms might indicate cardiac strain, angina, or arterial hypertension. We strongly advise a clinical assessment by a Cardiologist. If pain is severe or crushing, please visit an Emergency Room immediately.',
        urgency: 'high',
        icon: 'heart-pulse',
        color: '#DC2626',
      },
      {
        keywords: ['skin rash', 'acne', 'itching', 'eczema', 'skin redness', 'moles', 'hair fall', 'dandruff', 'psoriasis', 'hives', 'fungal infection'],
        specialty: 'Dermatology',
        description: 'Your symptoms point toward dermatological inflammation, allergic dermatitis, or cutaneous infection. A Dermatologist can perform dermoscopy and recommend targeted topical or systemic therapy.',
        urgency: 'low',
        icon: 'sparkles',
        color: '#0D9488',
      },
      {
        keywords: ['severe headache', 'migraine', 'dizziness', 'numbness', 'memory loss', 'tremor', 'fainting', 'tingling hands', 'vertigo', 'loss of balance'],
        specialty: 'Neurology',
        description: 'Neurological symptoms like recurring headaches, peripheral tingling, or dizziness warrant a dedicated consultation with a Neurologist for neuro-vascular evaluation.',
        urgency: 'medium',
        icon: 'brain',
        color: '#7C3AED',
      },
      {
        keywords: ['child fever', 'baby cough', 'infant rash', 'child vomiting', 'pediatric growth', 'vaccination', 'infant colic', 'measles', 'mumps'],
        specialty: 'Pediatrics',
        description: 'Pediatric illnesses require gentle, specialized pediatric diagnosis. We recommend an appointment with a certified Pediatrician for specialized clinical evaluation.',
        urgency: 'medium',
        icon: 'baby',
        color: '#2563EB',
      },
      {
        keywords: ['joint pain', 'knee pain', 'back pain', 'fracture', 'bone ache', 'stiff neck', 'arthritis', 'shoulder pain', 'ligament tear', 'ankle sprain', 'sciatica'],
        specialty: 'Orthopedics',
        description: 'Musculoskeletal discomfort, cartilage degeneration, or joint trauma is evaluated by an Orthopedic specialist to restore mobility and alleviate pain.',
        urgency: 'medium',
        icon: 'bone',
        color: '#D97706',
      },
      {
        keywords: ['fever', 'cold', 'cough', 'fatigue', 'weakness', 'sore throat', 'body ache', 'vomiting', 'nausea', 'chills', 'viral infection', 'stomach ache'],
        specialty: 'General Medicine',
        description: 'Constitutional viral symptoms, fever, and general fatigue should be evaluated by a General Physician for clinical triage, blood work, and holistic medical treatment.',
        urgency: 'low',
        icon: 'stethoscope',
        color: '#059669',
      },
    ];

    await Symptom.insertMany(symptomsData);

    console.log('⭐ Creating realistic demo appointments, reviews & telehealth meetings...');
    const firstDoc = await DoctorProfile.findOne({ email: 'dr.sharma@doctorp.com' }) || await DoctorProfile.findOne();
    if (firstDoc) {
      // Past completed appointment with full review
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);
      const pastDateStr = pastDate.toISOString().slice(0, 10);

      const pastApt = await Appointment.create({
        doctorId: firstDoc._id,
        patientId: patientUser._id,
        appointmentDate: pastDateStr,
        startTime: '10:00',
        endTime: '10:30',
        consultationType: 'In-Clinic Visit',
        reason: 'Routine ECG and Cardiovascular Follow-up',
        fee: firstDoc.consultationFee,
        status: 'completed',
        notes: 'Patient advised to continue low-sodium diet and daily 30-min walking. Blood pressure well controlled at 122/80.',
        prescription: 'Tab. Telmisartan 40mg once daily after breakfast. Tab. Ecosprin 75mg once daily.',
        isReviewed: true,
      });

      await Review.create({
        doctorId: firstDoc._id,
        patientId: patientUser._id,
        appointmentId: pastApt._id,
        rating: 5,
        review: 'Dr. Sharma is outstanding! He took 25 minutes to thoroughly analyze my previous ECG and lipid profile, explaining the lifestyle changes clearly without rushing. Very reassuring bedside manner.',
        tags: ['Punctual', 'Empathetic', 'Crystal Clear Explanations', 'Top Hospital'],
      });

      // Upcoming confirmed appointment with Video Telehealth link
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 2);
      const nextDateStr = nextDate.toISOString().slice(0, 10);

      await Appointment.create({
        doctorId: firstDoc._id,
        patientId: patientUser._id,
        appointmentDate: nextDateStr,
        startTime: '14:30',
        endTime: '15:00',
        consultationType: 'Video Consultation',
        meetingLink: 'https://meet.doctorp.com/room/APT-TELEHEALTH-DEMO',
        reason: 'Review lipid profile lab results online',
        fee: firstDoc.consultationFee,
        status: 'confirmed',
      });
    }

    console.log('✅ Realistic database seeded successfully!');
    console.log('──────────────────────────────────────────────────');
    console.log('🔑 Verified Demo Accounts:');
    console.log('   👑 Admin:   admin@doctorp.com   / Admin@123');
    console.log('   👨‍⚕️ Doctor:  dr.sharma@doctorp.com / Doctor@123');
    console.log('   👤 Patient: patient@doctorp.com / Patient@123');
    console.log('──────────────────────────────────────────────────');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding Error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
