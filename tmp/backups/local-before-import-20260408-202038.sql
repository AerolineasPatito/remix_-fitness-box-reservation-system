--
-- PostgreSQL database dump
--

-- Dumped from database version 10.23
-- Dumped by pg_dump version 10.23

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'WIN1252';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: ajustes_credito; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.ajustes_credito (
    id text NOT NULL,
    alumno_id text NOT NULL,
    suscripcion_id text,
    actor_id text,
    ajuste integer NOT NULL,
    motivo text,
    clases_restantes_antes integer,
    clases_restantes_despues integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.ajustes_credito OWNER TO cabreu145_focusfitness_user;

--
-- Name: class_types; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.class_types (
    id text NOT NULL,
    name text NOT NULL,
    image_url text,
    icon text,
    color_theme text,
    description text,
    duration integer DEFAULT 60 NOT NULL,
    is_active integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.class_types OWNER TO cabreu145_focusfitness_user;

--
-- Name: classes; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.classes (
    id text NOT NULL,
    type text,
    class_type_id text,
    date text,
    start_time text,
    end_time text,
    capacity integer DEFAULT 8,
    min_capacity integer DEFAULT 1,
    max_capacity integer DEFAULT 8,
    status text DEFAULT 'active'::text,
    cancellation_reason text,
    cancellation_source text,
    cancellation_notified_at timestamp without time zone,
    created_by text,
    updated_by text,
    canceled_by text,
    real_time_status text DEFAULT 'scheduled'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.classes OWNER TO cabreu145_focusfitness_user;

--
-- Name: paquetes; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.paquetes (
    id text NOT NULL,
    nombre text NOT NULL,
    capacidad integer DEFAULT 1 NOT NULL,
    numero_clases integer NOT NULL,
    vigencia_semanas integer NOT NULL,
    detalles text,
    precio_base numeric DEFAULT 0 NOT NULL,
    estado text DEFAULT 'active'::text NOT NULL,
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.paquetes OWNER TO cabreu145_focusfitness_user;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.profiles (
    id text NOT NULL,
    email text,
    full_name text,
    password_hash text,
    role text DEFAULT 'student'::text,
    credits_remaining integer DEFAULT 0,
    total_attended integer DEFAULT 0,
    patient_external_id text,
    email_verified boolean DEFAULT false,
    email_verification_token text,
    email_verification_expires text,
    password_reset_token text,
    password_reset_expires text,
    policy_accepted_at timestamp without time zone,
    whatsapp_phone text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.profiles OWNER TO cabreu145_focusfitness_user;

--
-- Name: registros_asistencia; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.registros_asistencia (
    id text NOT NULL,
    alumno_id text NOT NULL,
    clase_id text NOT NULL,
    suscripcion_id text NOT NULL,
    estado text DEFAULT 'attended'::text NOT NULL,
    asistio_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    registrado_por text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.registros_asistencia OWNER TO cabreu145_focusfitness_user;

--
-- Name: reservations; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.reservations (
    id text NOT NULL,
    user_id text,
    class_id text,
    suscripcion_id text,
    beneficiario_id text,
    status text DEFAULT 'active'::text,
    cancellation_reason text,
    cancellation_notified_at timestamp without time zone,
    cancellation_notified_to_student integer DEFAULT 0,
    cancellation_notified_to_business integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.reservations OWNER TO cabreu145_focusfitness_user;

--
-- Name: suscripcion_beneficiarios; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.suscripcion_beneficiarios (
    id text NOT NULL,
    suscripcion_id text NOT NULL,
    alumno_id text NOT NULL,
    es_titular integer DEFAULT 0 NOT NULL,
    clases_asignadas integer DEFAULT 0 NOT NULL,
    clases_restantes integer DEFAULT 0 NOT NULL,
    estado text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.suscripcion_beneficiarios OWNER TO cabreu145_focusfitness_user;

--
-- Name: suscripciones_alumno; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.suscripciones_alumno (
    id text NOT NULL,
    alumno_id text NOT NULL,
    paquete_id text,
    fecha_compra timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_vencimiento timestamp without time zone NOT NULL,
    clases_totales integer NOT NULL,
    clases_restantes integer NOT NULL,
    clases_consumidas integer DEFAULT 0 NOT NULL,
    estado text DEFAULT 'active'::text NOT NULL,
    congelado integer DEFAULT 0 NOT NULL,
    freeze_iniciado_en timestamp without time zone,
    dias_congelados integer DEFAULT 0 NOT NULL,
    notas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.suscripciones_alumno OWNER TO cabreu145_focusfitness_user;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.system_settings (
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO cabreu145_focusfitness_user;

--
-- Name: transacciones_pago; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.transacciones_pago (
    id text NOT NULL,
    suscripcion_id text NOT NULL,
    alumno_id text NOT NULL,
    paquete_id text,
    monto numeric NOT NULL,
    moneda text DEFAULT 'MXN'::text NOT NULL,
    metodo_pago text,
    referencia text,
    fecha_pago timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.transacciones_pago OWNER TO cabreu145_focusfitness_user;

--
-- Name: whatsapp_templates; Type: TABLE; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE TABLE public.whatsapp_templates (
    id text NOT NULL,
    name text NOT NULL,
    body text NOT NULL,
    is_default_cancellation integer DEFAULT 0 NOT NULL,
    is_active integer DEFAULT 1 NOT NULL,
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.whatsapp_templates OWNER TO cabreu145_focusfitness_user;

--
-- Data for Name: ajustes_credito; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.ajustes_credito (id, alumno_id, suscripcion_id, actor_id, ajuste, motivo, clases_restantes_antes, clases_restantes_despues, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: class_types; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.class_types (id, name, image_url, icon, color_theme, description, duration, is_active, created_at, updated_at) FROM stdin;
ctype_funcional	Entrenamiento Funcional		fa-bolt	amber	Entrenamiento dinamico para fuerza funcional y movilidad.	60	1	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584
ctype_sculpt_strength	Sculpt and Strength		fa-dumbbell	cyan	Tonificacion y fuerza con enfoque en tecnica y control.	60	1	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584
ctype_hiit	HIIT Conditioning		fa-heartbeat	rose	Alta intensidad para resistencia cardiovascular y quema calorica.	60	1	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584
ctype_lower_body	Sculpt Lower Body		fa-shoe-prints	indigo	Trabajo especifico de tren inferior y estabilidad.	60	1	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584
ctype_full_body	Full Body		fa-user-check	emerald	Sesion integral para todo el cuerpo.	60	1	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.classes (id, type, class_type_id, date, start_time, end_time, capacity, min_capacity, max_capacity, status, cancellation_reason, cancellation_source, cancellation_notified_at, created_by, updated_by, canceled_by, real_time_status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: paquetes; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.paquetes (id, nombre, capacidad, numero_clases, vigencia_semanas, detalles, precio_base, estado, created_by, updated_by, created_at, updated_at, deleted_at) FROM stdin;
pack_start	FOCUS START	1	12	4	Paquete de inicio	899	active	\N	\N	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584	\N
pack_base	FOCUS BASE	1	20	6	Paquete intermedio	1399	active	\N	\N	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584	\N
pack_work	FOCUS WORK	1	30	8	Paquete individual premium	1999	active	\N	\N	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584	\N
pack_duo	FOCUS DUO	2	46	8	Paquete compartido para 2 personas	2899	active	\N	\N	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584	\N
pack_crew	FOCUS CREW	3	60	10	Paquete compartido para 3 personas	3599	active	\N	\N	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584	\N
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.profiles (id, email, full_name, password_hash, role, credits_remaining, total_attended, patient_external_id, email_verified, email_verification_token, email_verification_expires, password_reset_token, password_reset_expires, policy_accepted_at, whatsapp_phone, created_at, updated_at, deleted_at) FROM stdin;
usr_admin	cabreu145@gmail.com	cabreudev	$2b$10$AxWze8JjEIvx1ObbMB8sf.YGXH3bD0hWT6DSL/vUp9BOB7KI8Xh0u	admin	0	0	\N	t	\N	\N	\N	\N	\N	\N	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584	\N
\.


--
-- Data for Name: registros_asistencia; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.registros_asistencia (id, alumno_id, clase_id, suscripcion_id, estado, asistio_en, registrado_por, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.reservations (id, user_id, class_id, suscripcion_id, beneficiario_id, status, cancellation_reason, cancellation_notified_at, cancellation_notified_to_student, cancellation_notified_to_business, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: suscripcion_beneficiarios; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.suscripcion_beneficiarios (id, suscripcion_id, alumno_id, es_titular, clases_asignadas, clases_restantes, estado, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: suscripciones_alumno; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.suscripciones_alumno (id, alumno_id, paquete_id, fecha_compra, fecha_vencimiento, clases_totales, clases_restantes, clases_consumidas, estado, congelado, freeze_iniciado_en, dias_congelados, notas, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.system_settings (setting_key, setting_value, updated_at) FROM stdin;
cancellation_limit_hours	8	2026-04-08 20:05:06.509584
cancellation_cutoff_morning	08:00	2026-04-08 20:05:06.509584
cancellation_deadline_evening	22:00	2026-04-08 20:05:06.509584
\.


--
-- Data for Name: transacciones_pago; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.transacciones_pago (id, suscripcion_id, alumno_id, paquete_id, monto, moneda, metodo_pago, referencia, fecha_pago, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: whatsapp_templates; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.whatsapp_templates (id, name, body, is_default_cancellation, is_active, created_by, updated_by, created_at, updated_at) FROM stdin;
watpl_default_cancel	Cancelacion de clase	Hola {{nombre_alumno}}, tu clase "{{clase_activa}}" del {{fecha_cancelacion}} fue cancelada. Si necesitas apoyo para reagendar, estoy pendiente.	1	1	system	\N	2026-04-08 20:05:06.509584	2026-04-08 20:05:06.509584
\.


--
-- Name: ajustes_credito ajustes_credito_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.ajustes_credito
    ADD CONSTRAINT ajustes_credito_pkey PRIMARY KEY (id);


--
-- Name: class_types class_types_name_key; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.class_types
    ADD CONSTRAINT class_types_name_key UNIQUE (name);


--
-- Name: class_types class_types_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.class_types
    ADD CONSTRAINT class_types_pkey PRIMARY KEY (id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: paquetes paquetes_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.paquetes
    ADD CONSTRAINT paquetes_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: registros_asistencia registros_asistencia_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.registros_asistencia
    ADD CONSTRAINT registros_asistencia_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: suscripcion_beneficiarios suscripcion_beneficiarios_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.suscripcion_beneficiarios
    ADD CONSTRAINT suscripcion_beneficiarios_pkey PRIMARY KEY (id);


--
-- Name: suscripcion_beneficiarios suscripcion_beneficiarios_suscripcion_id_alumno_id_key; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.suscripcion_beneficiarios
    ADD CONSTRAINT suscripcion_beneficiarios_suscripcion_id_alumno_id_key UNIQUE (suscripcion_id, alumno_id);


--
-- Name: suscripciones_alumno suscripciones_alumno_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.suscripciones_alumno
    ADD CONSTRAINT suscripciones_alumno_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (setting_key);


--
-- Name: transacciones_pago transacciones_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.transacciones_pago
    ADD CONSTRAINT transacciones_pago_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_templates whatsapp_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);


--
-- Name: idx_asistencia_alumno_clase; Type: INDEX; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE INDEX idx_asistencia_alumno_clase ON public.registros_asistencia USING btree (alumno_id, clase_id);


--
-- Name: idx_beneficiarios_alumno; Type: INDEX; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE INDEX idx_beneficiarios_alumno ON public.suscripcion_beneficiarios USING btree (alumno_id, estado);


--
-- Name: idx_beneficiarios_suscripcion; Type: INDEX; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE INDEX idx_beneficiarios_suscripcion ON public.suscripcion_beneficiarios USING btree (suscripcion_id, alumno_id);


--
-- Name: idx_suscripciones_alumno_estado; Type: INDEX; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE INDEX idx_suscripciones_alumno_estado ON public.suscripciones_alumno USING btree (alumno_id, estado);


--
-- Name: idx_suscripciones_vencimiento; Type: INDEX; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE INDEX idx_suscripciones_vencimiento ON public.suscripciones_alumno USING btree (fecha_vencimiento);


--
-- Name: idx_transacciones_fecha; Type: INDEX; Schema: public; Owner: cabreu145_focusfitness_user
--

CREATE INDEX idx_transacciones_fecha ON public.transacciones_pago USING btree (fecha_pago);


--
-- Name: ajustes_credito ajustes_credito_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.ajustes_credito
    ADD CONSTRAINT ajustes_credito_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.profiles(id);


--
-- Name: ajustes_credito ajustes_credito_suscripcion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.ajustes_credito
    ADD CONSTRAINT ajustes_credito_suscripcion_id_fkey FOREIGN KEY (suscripcion_id) REFERENCES public.suscripciones_alumno(id);


--
-- Name: classes classes_class_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_class_type_id_fkey FOREIGN KEY (class_type_id) REFERENCES public.class_types(id);


--
-- Name: registros_asistencia registros_asistencia_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.registros_asistencia
    ADD CONSTRAINT registros_asistencia_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.profiles(id);


--
-- Name: registros_asistencia registros_asistencia_clase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.registros_asistencia
    ADD CONSTRAINT registros_asistencia_clase_id_fkey FOREIGN KEY (clase_id) REFERENCES public.classes(id);


--
-- Name: registros_asistencia registros_asistencia_suscripcion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.registros_asistencia
    ADD CONSTRAINT registros_asistencia_suscripcion_id_fkey FOREIGN KEY (suscripcion_id) REFERENCES public.suscripciones_alumno(id);


--
-- Name: reservations reservations_beneficiario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_beneficiario_id_fkey FOREIGN KEY (beneficiario_id) REFERENCES public.suscripcion_beneficiarios(id);


--
-- Name: reservations reservations_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: reservations reservations_suscripcion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_suscripcion_id_fkey FOREIGN KEY (suscripcion_id) REFERENCES public.suscripciones_alumno(id);


--
-- Name: reservations reservations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: suscripcion_beneficiarios suscripcion_beneficiarios_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.suscripcion_beneficiarios
    ADD CONSTRAINT suscripcion_beneficiarios_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.profiles(id);


--
-- Name: suscripcion_beneficiarios suscripcion_beneficiarios_suscripcion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.suscripcion_beneficiarios
    ADD CONSTRAINT suscripcion_beneficiarios_suscripcion_id_fkey FOREIGN KEY (suscripcion_id) REFERENCES public.suscripciones_alumno(id);


--
-- Name: suscripciones_alumno suscripciones_alumno_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.suscripciones_alumno
    ADD CONSTRAINT suscripciones_alumno_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.profiles(id);


--
-- Name: suscripciones_alumno suscripciones_alumno_paquete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.suscripciones_alumno
    ADD CONSTRAINT suscripciones_alumno_paquete_id_fkey FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id);


--
-- Name: transacciones_pago transacciones_pago_alumno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.transacciones_pago
    ADD CONSTRAINT transacciones_pago_alumno_id_fkey FOREIGN KEY (alumno_id) REFERENCES public.profiles(id);


--
-- Name: transacciones_pago transacciones_pago_paquete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.transacciones_pago
    ADD CONSTRAINT transacciones_pago_paquete_id_fkey FOREIGN KEY (paquete_id) REFERENCES public.paquetes(id);


--
-- Name: transacciones_pago transacciones_pago_suscripcion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cabreu145_focusfitness_user
--

ALTER TABLE ONLY public.transacciones_pago
    ADD CONSTRAINT transacciones_pago_suscripcion_id_fkey FOREIGN KEY (suscripcion_id) REFERENCES public.suscripciones_alumno(id);


--
-- PostgreSQL database dump complete
--

