--
-- PostgreSQL database dump
--

-- Dumped from database version 10.23
-- Dumped by pg_dump version 10.23

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.transacciones_pago DROP CONSTRAINT transacciones_pago_suscripcion_id_fkey;
ALTER TABLE ONLY public.transacciones_pago DROP CONSTRAINT transacciones_pago_paquete_id_fkey;
ALTER TABLE ONLY public.transacciones_pago DROP CONSTRAINT transacciones_pago_alumno_id_fkey;
ALTER TABLE ONLY public.suscripciones_alumno DROP CONSTRAINT suscripciones_alumno_paquete_id_fkey;
ALTER TABLE ONLY public.suscripciones_alumno DROP CONSTRAINT suscripciones_alumno_alumno_id_fkey;
ALTER TABLE ONLY public.suscripcion_beneficiarios DROP CONSTRAINT suscripcion_beneficiarios_suscripcion_id_fkey;
ALTER TABLE ONLY public.suscripcion_beneficiarios DROP CONSTRAINT suscripcion_beneficiarios_alumno_id_fkey;
ALTER TABLE ONLY public.reservations DROP CONSTRAINT reservations_user_id_fkey;
ALTER TABLE ONLY public.reservations DROP CONSTRAINT reservations_suscripcion_id_fkey;
ALTER TABLE ONLY public.reservations DROP CONSTRAINT reservations_class_id_fkey;
ALTER TABLE ONLY public.reservations DROP CONSTRAINT reservations_beneficiario_id_fkey;
ALTER TABLE ONLY public.registros_asistencia DROP CONSTRAINT registros_asistencia_suscripcion_id_fkey;
ALTER TABLE ONLY public.registros_asistencia DROP CONSTRAINT registros_asistencia_clase_id_fkey;
ALTER TABLE ONLY public.registros_asistencia DROP CONSTRAINT registros_asistencia_alumno_id_fkey;
ALTER TABLE ONLY public.classes DROP CONSTRAINT classes_class_type_id_fkey;
ALTER TABLE ONLY public.ajustes_credito DROP CONSTRAINT ajustes_credito_suscripcion_id_fkey;
ALTER TABLE ONLY public.ajustes_credito DROP CONSTRAINT ajustes_credito_alumno_id_fkey;
DROP INDEX public.idx_transacciones_fecha;
DROP INDEX public.idx_suscripciones_vencimiento;
DROP INDEX public.idx_suscripciones_alumno_estado;
DROP INDEX public.idx_beneficiarios_suscripcion;
DROP INDEX public.idx_beneficiarios_alumno;
DROP INDEX public.idx_asistencia_alumno_clase;
ALTER TABLE ONLY public.whatsapp_templates DROP CONSTRAINT whatsapp_templates_pkey;
ALTER TABLE ONLY public.transacciones_pago DROP CONSTRAINT transacciones_pago_pkey;
ALTER TABLE ONLY public.system_settings DROP CONSTRAINT system_settings_pkey;
ALTER TABLE ONLY public.suscripciones_alumno DROP CONSTRAINT suscripciones_alumno_pkey;
ALTER TABLE ONLY public.suscripcion_beneficiarios DROP CONSTRAINT suscripcion_beneficiarios_suscripcion_id_alumno_id_key;
ALTER TABLE ONLY public.suscripcion_beneficiarios DROP CONSTRAINT suscripcion_beneficiarios_pkey;
ALTER TABLE ONLY public.reservations DROP CONSTRAINT reservations_pkey;
ALTER TABLE ONLY public.registros_asistencia DROP CONSTRAINT registros_asistencia_pkey;
ALTER TABLE ONLY public.profiles DROP CONSTRAINT profiles_pkey;
ALTER TABLE ONLY public.profiles DROP CONSTRAINT profiles_email_key;
ALTER TABLE ONLY public.paquetes DROP CONSTRAINT paquetes_pkey;
ALTER TABLE ONLY public.classes DROP CONSTRAINT classes_pkey;
ALTER TABLE ONLY public.class_types DROP CONSTRAINT class_types_pkey;
ALTER TABLE ONLY public.class_types DROP CONSTRAINT class_types_name_key;
ALTER TABLE ONLY public.ajustes_credito DROP CONSTRAINT ajustes_credito_pkey;
DROP TABLE public.whatsapp_templates;
DROP TABLE public.transacciones_pago;
DROP TABLE public.system_settings;
DROP TABLE public.suscripciones_alumno;
DROP TABLE public.suscripcion_beneficiarios;
DROP TABLE public.reservations;
DROP TABLE public.registros_asistencia;
DROP TABLE public.profiles;
DROP TABLE public.paquetes;
DROP TABLE public.classes;
DROP TABLE public.class_types;
DROP TABLE public.ajustes_credito;
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--




--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--



--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--



--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--



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
adj_l1zetrpgc	usr_i15nihhvn	subs_5t94xc9gn	coach	1	Ajuste manual	12	13	2026-04-03 12:29:50.35848	2026-04-03 12:29:50.35848	\N
adj_514dj1yob	usr_qfa7cpkag	subs_j5m6chexg	coach	1	Ajuste manual	23	24	2026-04-03 13:55:43.457044	2026-04-03 13:55:43.457044	\N
adj_i7orbvo3t	usr_qfa7cpkag	subs_j5m6chexg	coach	10	Ajuste manual	24	34	2026-04-03 13:55:49.469593	2026-04-03 13:55:49.469593	\N
adj_pclu000qz	usr_qfa7cpkag	subs_j5m6chexg	coach	1	Ajuste manual	34	35	2026-04-03 13:55:51.268379	2026-04-03 13:55:51.268379	\N
adj_5yr5xr5a6	usr_qfa7cpkag	subs_j5m6chexg	usr_ohxs25mdy	17	actualizacion de clases	35	52	2026-04-03 13:56:36.107689	2026-04-03 13:56:36.107689	\N
adj_sddugefp2	usr_qfa7cpkag	subs_j5m6chexg	usr_ohxs25mdy	-35	ajuste	52	17	2026-04-03 13:59:25.083659	2026-04-03 13:59:25.083659	\N
adj_uidzsh1q9	usr_qfa7cpkag	subs_1t7t46sup	usr_ohxs25mdy	-23	ajuste clases	23	0	2026-04-03 14:07:50.668957	2026-04-03 14:07:50.668957	\N
adj_16eqbqzf4	usr_lgd7ckv81	subs_1hlo4ggb1	coach	1	Ajuste manual	20	21	2026-04-03 14:21:51.285802	2026-04-03 14:21:51.285802	\N
adj_1po9j5asz	usr_lgd7ckv81	subs_1hlo4ggb1	usr_ohxs25mdy	-9	ajuste	21	12	2026-04-03 14:25:28.411001	2026-04-03 14:25:28.411001	\N
adj_ihb797zfi	usr_lgd7ckv81	subs_dq1zhxsp1	usr_ohxs25mdy	-1	ajuste	20	19	2026-04-03 14:28:35.339334	2026-04-03 14:28:35.339334	\N
adj_d73a5ijoy	usr_lgd7ckv81	subs_dq1zhxsp1	usr_ohxs25mdy	-19	ajuste	19	0	2026-04-03 14:29:38.543776	2026-04-03 14:29:38.543776	\N
adj_8do34xxhq	usr_lgd7ckv81	subs_dq1zhxsp1	usr_ohxs25mdy	0	ajuste	0	0	2026-04-03 14:30:28.089439	2026-04-03 14:30:28.089439	\N
adj_b1osy0wmf	usr_qfa7cpkag	subs_1t7t46sup	coach	1	Ajuste manual	0	1	2026-04-03 14:32:19.617974	2026-04-03 14:32:19.617974	\N
adj_fgldlwky9	usr_qfa7cpkag	subs_1t7t46sup	coach	1	Ajuste manual	1	2	2026-04-03 14:32:20.530029	2026-04-03 14:32:20.530029	\N
adj_e19xtrqwd	usr_qfa7cpkag	subs_1t7t46sup	coach	1	Ajuste manual	2	3	2026-04-03 14:32:21.461498	2026-04-03 14:32:21.461498	\N
adj_45bwan56j	usr_lgd7ckv81	subs_dq1zhxsp1	usr_ohxs25mdy	0	ajuste	0	0	2026-04-03 14:33:12.147031	2026-04-03 14:33:12.147031	\N
adj_r6wtfglse	usr_lgd7ckv81	subs_nk6nzhxwf	usr_ohxs25mdy	-20	ajuste	20	0	2026-04-03 14:33:55.828277	2026-04-03 14:33:55.828277	\N
adj_odhz1ecti	usr_lgd7ckv81	subs_nk6nzhxwf	usr_ohxs25mdy	0	.	0	0	2026-04-03 14:34:35.7199	2026-04-03 14:34:35.7199	\N
adj_9la3krtro	usr_lgd7ckv81	subs_vxewn5873	usr_ohxs25mdy	-20	ajuste	20	0	2026-04-03 14:37:04.134665	2026-04-03 14:37:04.134665	\N
adj_bht5uurj1	usr_lgd7ckv81	subs_vxewn5873	usr_ohxs25mdy	0	-	0	0	2026-04-03 14:38:04.883893	2026-04-03 14:38:04.883893	\N
adj_ze9k0kvjn	usr_lgd7ckv81	subs_vxewn5873	usr_ohxs25mdy	0	ajuste	0	0	2026-04-03 14:38:28.393681	2026-04-03 14:38:28.393681	\N
adj_9b6qzvzrb	usr_lgd7ckv81	subs_8go3nt45r	usr_ohxs25mdy	-20	ajuste	20	0	2026-04-03 14:41:52.877741	2026-04-03 14:41:52.877741	\N
adj_8p73wx287	usr_tqs18a3z8	subs_wyrbe5g31	usr_ohxs25mdy	-9	ajuste	23	14	2026-04-03 14:51:41.13868	2026-04-03 14:51:41.13868	\N
adj_jgs1zremd	usr_lgd7ckv81	subs_3vu39e92c	usr_ohxs25mdy	-20	clases	20	0	2026-04-03 14:57:36.35744	2026-04-03 14:57:36.35744	\N
adj_3mkodp9jf	usr_lgd7ckv81	subs_pt6wrujgf	usr_ohxs25mdy	-20	.	20	0	2026-04-03 14:58:53.928057	2026-04-03 14:58:53.928057	\N
adj_cwi2a7n6a	usr_lgd7ckv81	subs_pt6wrujgf	usr_ohxs25mdy	0	ju	0	0	2026-04-03 14:59:17.552503	2026-04-03 14:59:17.552503	\N
adj_9erz4gdi5	usr_i15nihhvn	subs_92a2py342	usr_ohxs25mdy	-20	.	20	0	2026-04-03 15:03:42.302025	2026-04-03 15:03:42.302025	\N
adj_6kop9d6vj	usr_i15nihhvn	subs_92a2py342	usr_ohxs25mdy	0	.	0	0	2026-04-03 15:04:19.48035	2026-04-03 15:04:19.48035	\N
adj_vuwq3xgc8	usr_k1bfjn3v1	subs_41dunlkxy	usr_ohxs25mdy	-7	Ajuste	20	13	2026-04-05 21:47:35.323967	2026-04-05 21:47:35.323967	\N
adj_6k1uykb8i	usr_3k34pmfmf	subs_cg9mm8cnz	usr_ohxs25mdy	-5	Ajuste	20	15	2026-04-05 21:49:05.994456	2026-04-05 21:49:05.994456	\N
adj_5aqyh3a6q	usr_5n3wyz7w3	subs_yxamux1kf	usr_ohxs25mdy	-14	Ajuste	20	6	2026-04-05 21:53:19.921099	2026-04-05 21:53:19.921099	\N
adj_b9iiovcn3	usr_yytk7jgtb	subs_0n1exa3u0	usr_ohxs25mdy	-1	Ajuste	8	7	2026-04-05 22:00:41.061894	2026-04-05 22:00:41.061894	\N
adj_uhf6bcjru	usr_tfdafaulh	subs_vmzue8ced	usr_ohxs25mdy	-16	Ajuste clase	20	4	2026-04-05 22:03:35.076379	2026-04-05 22:03:35.076379	\N
adj_jzg9zk70m	usr_a80ajrgrh	subs_cqdg9kctm	usr_ohxs25mdy	-10	Ajuste	20	10	2026-04-05 22:04:37.858022	2026-04-05 22:04:37.858022	\N
adj_ai7mheo37	usr_lgd7ckv81	subs_isg4p4wn1	usr_ohxs25mdy	-9	Ajuste	20	11	2026-04-05 22:05:45.101851	2026-04-05 22:05:45.101851	\N
adj_ufyxign0u	usr_lgd7ckv81	subs_isg4p4wn1	usr_ohxs25mdy	-11	Ajuste	11	0	2026-04-05 22:07:32.474163	2026-04-05 22:07:32.474163	\N
adj_8ir3iwweq	usr_lgd7ckv81	subs_isg4p4wn1	usr_ohxs25mdy	0	Ajuste	0	0	2026-04-05 22:08:23.293554	2026-04-05 22:08:23.293554	\N
adj_nws7ajyg2	usr_lgd7ckv81	subs_isg4p4wn1	usr_ohxs25mdy	0	Ajuste	0	0	2026-04-05 22:08:36.220549	2026-04-05 22:08:36.220549	\N
adj_qcdshi36p	usr_lgd7ckv81	subs_icsdpilz2	usr_ohxs25mdy	-9	Ajuste	20	11	2026-04-05 22:11:12.818383	2026-04-05 22:11:12.818383	\N
adj_ymt2p3v6k	usr_lgd7ckv81	subs_icsdpilz2	usr_ohxs25mdy	-11	Ajuste	11	0	2026-04-05 22:12:32.713939	2026-04-05 22:12:32.713939	\N
adj_ubm5qddz7	usr_lgd7ckv81	subs_usqidzuur	usr_ohxs25mdy	-9	Si	9	0	2026-04-05 22:14:16.166375	2026-04-05 22:14:16.166375	\N
adj_b9tk6a7d3	usr_lgd7ckv81	subs_usqidzuur	coach	1	Ajuste manual	0	1	2026-04-05 22:14:31.857505	2026-04-05 22:14:31.857505	\N
adj_0ai9v5sra	usr_rjcwgh32i	subs_t3k8091jq	usr_ohxs25mdy	-2	Ahuste	20	18	2026-04-06 00:28:21.613458	2026-04-06 00:28:21.613458	\N
adj_2frdpoq4t	usr_z1eunklgk	subs_42ynvjwwf	usr_ohxs25mdy	-2	Ajuste	8	6	2026-04-06 00:41:13.028321	2026-04-06 00:41:13.028321	\N
adj_aeyg1chwa	usr_5b92foz1t	subs_7mgfeit0d	usr_ohxs25mdy	-1	Ajuste	12	11	2026-04-06 13:42:19.242946	2026-04-06 13:42:19.242946	\N
adj_8ykrvwny4	usr_5b92foz1t	subs_7mgfeit0d	usr_ohxs25mdy	-11	Ajuste	11	0	2026-04-06 13:43:01.055891	2026-04-06 13:43:01.055891	\N
adj_75r9fd4pu	usr_5b92foz1t	subs_7mgfeit0d	usr_ohxs25mdy	0	Ajuste	0	0	2026-04-06 13:43:33.567647	2026-04-06 13:43:33.567647	\N
adj_vuxalc2rh	usr_5b92foz1t	subs_75jr467ea	usr_ohxs25mdy	-8	Ajuste	8	0	2026-04-06 13:45:12.966644	2026-04-06 13:45:12.966644	\N
adj_rzci1dmx1	usr_n0u99miop	subs_lm4ck6ga5	usr_ohxs25mdy	-8	Ajuste	20	12	2026-04-06 23:43:17.486325	2026-04-06 23:43:17.486325	\N
adj_g8zgwir82	usr_l9bj7v0ry	subs_ig9ftay8a	usr_ohxs25mdy	-14	Ajuste	20	6	2026-04-07 00:00:47.641658	2026-04-07 00:00:47.641658	\N
adj_r5anz2juu	usr_i15nihhvn	subs_5t94xc9gn	coach	1	Ajuste manual	10	11	2026-04-08 12:15:06.353716	2026-04-08 12:15:06.353716	\N
\.


--
-- Data for Name: class_types; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.class_types (id, name, image_url, icon, color_theme, description, duration, is_active, created_at, updated_at) FROM stdin;
ctype_sculpt_strength	Sculpt and Strength		fa-dumbbell	cyan	TonificaciÃ³n y fuerza con enfoque en tÃ©cnica y control.	60	0	2026-04-02 15:31:40.551503	2026-04-05 22:20:54.990268
ctype_0j4wrpt2c	fix	\N	fa-fire	emerald	\N	60	0	2026-04-03 12:30:24.651912	2026-04-05 22:20:58.051623
ctype_plogg9n1c	sculpt fullbody	\N	fa-spa	purple	una c.ase para molldear y tobificar ty cuerpo	60	0	2026-04-03 12:10:49.24237	2026-04-05 22:21:11.300731
ctype_h7ahn8l95	Sculpt Lower body	https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSygzNZ2APZK8yp-AGKzFhqjQo2R78bgYlbzQ&s	fa-dumbbell	brand	\N	60	1	2026-04-05 22:23:20.383152	2026-04-05 22:23:20.383152
ctype_lower_body	Sculpt Upper body	https://media.istockphoto.com/id/502292420/photo/fitness-is-his-way-of-life.jpg?s=612x612&w=0&k=20&c=DlUAPt81hjhh8AZmz9qLg-Mx_quXUKnYPQE0hNVWY_w=	fa-shoe-prints	indigo	Trabajo especÃ­fico de tren inferior y estabilidad.	60	1	2026-04-02 15:31:40.551503	2026-04-05 22:24:17.394119
ctype_hiit	HIIT Conditioning	https://t3.ftcdn.net/jpg/04/18/41/08/360_F_418410836_VPgx2b2I3Mgw4rRw3CtMRbLSlUSAquPC.jpg	fa-heartbeat	rose	Alta intensidad para resistencia cardiovascular y quema calÃ³rica.	60	1	2026-04-02 15:31:40.551503	2026-04-05 22:29:29.827728
ctype_full_body	Full Body	https://t3.ftcdn.net/jpg/05/47/36/94/360_F_547369435_dDujWO750cWtQqnVcdxMhDtxUQzLElfp.jpg	fa-user-check	emerald	SesiÃ³n integral para todo el cuerpo.	60	1	2026-04-02 15:31:40.551503	2026-04-05 22:34:28.405079
ctype_funcional	Functional training	https://plusfitness-production.s3.amazonaws.com/media/images/Blog__Media_bf3Pd9V.width-675.png	fa-bolt	amber	Entrenamiento dinÃ¡mico para fuerza funcional y movilidad.	60	1	2026-04-02 15:31:40.551503	2026-04-05 22:34:45.955051
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.classes (id, type, class_type_id, date, start_time, end_time, capacity, min_capacity, max_capacity, status, cancellation_reason, cancellation_source, cancellation_notified_at, created_by, updated_by, canceled_by, real_time_status, created_at, updated_at, deleted_at) FROM stdin;
cls_oap0ubn22	Sculpt Lower Body	ctype_lower_body	2026-04-04	08:00	09:00	8	3	8	canceled	\N	coach	\N	usr_ohxs25mdy	\N	usr_ohxs25mdy	canceled	2026-04-03 12:12:17.870587	2026-04-03 12:14:29.364565	\N
cls_00fa4yune	fix	ctype_0j4wrpt2c	2026-04-03	11:00	12:00	8	1	8	canceled	\N	coach	\N	usr_ohxs25mdy	\N	usr_ohxs25mdy	canceled	2026-04-03 12:30:52.364117	2026-04-03 12:31:38.064893	\N
cls_czrb40f0p	Full Body	ctype_full_body	2026-04-03	18:00	19:00	8	3	8	canceled	\N	coach	\N	usr_ohxs25mdy	\N	usr_ohxs25mdy	canceled	2026-04-03 12:32:04.053404	2026-04-03 13:42:53.64245	\N
cls_egvbmhlx8	Entrenamiento Funcional	ctype_funcional	2026-04-06	18:00	19:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:17:11.013557	2026-04-05 22:17:11.013557	\N
cls_y014kvlwf	Entrenamiento Funcional	ctype_funcional	2026-04-06	19:00	20:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:18:45.709645	2026-04-05 22:18:45.709645	\N
cls_ow421ghxt	HIIT Conditioning	ctype_hiit	2026-04-08	07:00	08:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:35:09.666994	2026-04-05 22:35:09.666994	\N
cls_pb9zzqq0q	HIIT Conditioning	ctype_hiit	2026-04-08	19:00	20:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:35:37.674415	2026-04-05 22:35:37.674415	\N
cls_a67or49eg	HIIT Conditioning	ctype_hiit	2026-04-08	18:00	19:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:35:54.485893	2026-04-05 22:35:54.485893	\N
cls_i4rzptnm6	Sculpt Upper body	ctype_lower_body	2026-04-07	07:00	08:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:36:10.873282	2026-04-05 22:36:10.873282	\N
cls_lurybhf5s	Sculpt Upper body	ctype_lower_body	2026-04-07	19:00	20:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:36:24.698565	2026-04-05 22:36:24.698565	\N
cls_dmbdsztor	Sculpt Upper body	ctype_lower_body	2026-04-07	18:00	19:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:36:42.270818	2026-04-05 22:36:42.270818	\N
cls_jb2patv49	Sculpt Lower body	ctype_h7ahn8l95	2026-04-09	07:00	08:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:38:34.823802	2026-04-05 22:38:34.823802	\N
cls_grsf4unv9	Sculpt Lower body	ctype_h7ahn8l95	2026-04-09	19:00	20:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:39:07.579731	2026-04-05 22:39:07.579731	\N
cls_amxay95y7	Full Body	ctype_full_body	2026-04-09	18:00	19:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:41:07.247908	2026-04-05 22:41:07.247908	\N
cls_tyva5t5fi	Full Body	ctype_full_body	2026-04-10	07:00	08:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:41:28.602373	2026-04-05 22:41:28.602373	\N
cls_lnb5jmcp5	Full Body	ctype_full_body	2026-04-10	18:00	19:00	8	3	8	active	\N	\N	\N	usr_ohxs25mdy	\N	\N	scheduled	2026-04-05 22:41:42.208952	2026-04-05 22:41:42.208952	\N
cls_g8wu68o38	Entrenamiento Funcional	ctype_funcional	2026-04-06	07:00	08:00	8	3	8	canceled	\N	coach	\N	usr_ohxs25mdy	\N	usr_ohxs25mdy	canceled	2026-04-05 22:16:10.333329	2026-04-06 00:22:17.909314	\N
\.


--
-- Data for Name: paquetes; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.paquetes (id, nombre, capacidad, numero_clases, vigencia_semanas, detalles, precio_base, estado, created_by, updated_by, created_at, updated_at, deleted_at) FROM stdin;
pack_work	FOCUS WORK	1	30	8	Paquete individual premium	1999	active	\N	\N	2026-04-02 15:31:40.551503	2026-04-02 15:31:40.551503	\N
pack_duo	FOCUS DUO	2	46	5	Paquete compartido para 2 personas	3375	active	\N	\N	2026-04-02 15:31:40.551503	2026-04-03 14:04:26.954883	\N
pack_base	FOCUS BASE	1	8	2	Paquete intermedio	1035	active	\N	\N	2026-04-02 15:31:40.551503	2026-04-05 21:59:55.671067	\N
pack_crew	FOCUS CREW	1	20	1	Paquete compartido para 3 personas	4050	active	\N	\N	2026-04-02 15:31:40.551503	2026-04-05 22:10:38.148048	\N
pack_start	FOCUS START	1	12	2	Paquete de inicio	899	active	\N	\N	2026-04-02 15:31:40.551503	2026-04-06 13:41:38.377359	\N
pack_065nu6tc0	FOCUS BUILD	1	14	5	\N	1260	active	\N	\N	2026-04-05 12:36:38.34024	2026-04-06 17:55:37.698541	\N
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.profiles (id, email, full_name, password_hash, role, credits_remaining, total_attended, patient_external_id, email_verified, email_verification_token, email_verification_expires, password_reset_token, password_reset_expires, policy_accepted_at, whatsapp_phone, created_at, updated_at, deleted_at) FROM stdin;
usr_admin	cabreudev	Administrador	$2b$10$JibeKS/eb.mZ5/zVr8G0nuUAkpkskpKFaxVnBXLjfS39DQEf452.C	admin	0	0	\N	t	\N	\N	\N	\N	\N	\N	2026-04-02 15:31:40.551503	2026-04-02 15:31:40.551503	\N
usr_5l64siqa5	cabreu145@gmail.com	cabreudev	$2b$10$b1b8VB6cFYfN/LeRWdpRfeK2csE0eQZ9hxcI9OrOCHZuMhyDjdsA2	admin	0	0	\N	t	\N	\N	\N	\N	\N	\N	2026-04-02 15:33:13.847812	2026-04-02 15:33:29.757823	2026-04-02 15:33:29.757823
usr_ohxs25mdy	polo	Leopoldo Martinez	$2b$10$3pCR2ZqvrdXt5BxgtMz3xenpGwtnXHpIa2.xnwlH7i9ciEMciNZLK	admin	0	0	\N	t	\N	\N	\N	\N	\N	\N	2026-04-02 15:39:32.24381	2026-04-02 15:39:32.24381	\N
usr_n0u99miop	jesusmezvicmid@gmail.com	JesÃºs Alonzo MÃ©zquita VictorÃ­n	$2b$10$tWoG1/3yu0il/UKeVgd2UuO8Jm.IBZkAFTXX97ZUWbYzhgoHiIWYm	student	8	0	\N	t	\N	\N	\N	\N	2026-04-06 23:45:33.462983	9993893310	2026-04-06 12:59:24.242541	2026-04-08 15:02:42.850977	\N
usr_o09jxlrjj	ernesto.urosado@gmail.com	Ernesto Rosado	$2b$10$jspcBWvVGNgK77LR5MyJY.GoxQe/Ft60kBAv7XbR/HNDpd55CUanG	student	13	0	\N	t	\N	\N	\N	\N	2026-04-06 18:00:43.836821	9991211871	2026-04-03 14:22:59.956005	2026-04-06 18:00:43.98624	\N
usr_h9uzuj3l1	mariana-garduno@hotmail.com	Mariana GarduÃ±o Canto	$2b$10$OHjxVG3DcEMIzKzLFgwecOjxXms.193gqSzk2xn5BwLgmAltiZzUu	student	0	0	\N	f	eb435a2c159d7623d4fd2f573b51ef3fcdf351e89a015e0e	2026-04-08T14:36:17.572Z	\N	\N	\N	9993323314	2026-04-07 10:36:17.572757	2026-04-07 10:36:17.572757	\N
usr_l9bj7v0ry	thalis_flakita@hotmail.com	Thalia Perez	$2b$10$f0z0t5kXg8w459GsGptT4OSnhlN7173DVsdyhX81Hwozg0R3K5SBW	student	5	0	\N	t	\N	\N	\N	\N	2026-04-08 15:21:47.422638	9997485071	2026-04-06 23:48:54.375264	2026-04-08 15:21:47.559952	\N
usr_i15nihhvn	jey.cguzman@hotmail.com	Jenny guzman	$2b$10$xfezaf7wocXPmAc2J12hS.mDMUwK.rZYi4QfxJJeFrQed88JP9Xo6	student	10	0	\N	t	\N	\N	\N	\N	2026-04-03 12:33:52.330208	9993313334	2026-04-03 12:20:20.200571	2026-04-08 15:27:13.340486	\N
usr_rjcwgh32i	goyovel@hotmail.com	Gregorio GÃ³mez	$2b$10$cdDSs4hcRqIcgaK.lvMxI.eD2SQDZ974qpbVhIbvt4ZE1oZViawIS	student	18	0	\N	t	\N	\N	\N	\N	\N	9993226865	2026-04-05 23:28:03.715253	2026-04-06 00:28:21.626017	\N
usr_5n3wyz7w3	erleo16@hotmail.com	ERICK GUZMAN	$2b$10$KRMvKkx7JQNhEw56JarVgeF4nyENG6jFTPF5cwhmKc5rBACeU3pxa	student	2	0	\N	t	\N	\N	\N	\N	2026-04-05 22:35:42.190363	9991118194	2026-04-03 17:04:42.448881	2026-04-08 18:28:18.834698	\N
usr_cxw8rx23c	yennimnadal@gmail.com	Yennely MartÃ­nez Nadal	$2b$10$O0haE/sZZEUTonS1wUuQDOYBDBkaVZbtrltW/5z5m.xZlD.hzYIm6	student	6	0	\N	t	\N	\N	\N	\N	2026-04-06 20:34:54.574306	9992323680	2026-04-03 16:55:45.128563	2026-04-06 20:41:23.756799	\N
usr_5b92foz1t	adrianlira92@gmail.com	Adrian lira peÃ±a	$2b$10$4OD9I58wi9GB7Z8UWJYbWelxuW5jzMGn82mc5oo0.gkWlk5imTPsy	student	9	0	\N	t	\N	\N	\N	\N	2026-04-06 13:50:19.631952	9992306182	2026-04-06 01:15:46.9645	2026-04-07 22:49:47.71982	\N
usr_3k34pmfmf	caritzi@hotmail.com	Itzel GÃ³mez	$2b$10$zUFZjHUQohEM9XP/z.NByu4zhh.cbGXlADCQuqVzv3RysOyIU7aEu	student	13	0	\N	t	\N	\N	\N	\N	2026-04-05 23:25:16.014305	9631362125	2026-04-03 16:13:13.771251	2026-04-06 21:04:05.268937	\N
usr_tfdafaulh	fabipadilladz@gmail.com	Fabiola Padilla Diaz	$2b$10$Fx00cOcNnR.BjNnyNqCooea8jZJ9cPCe3NGk9pmvdiOMB.QdhZ3Am	student	2	0	\N	t	\N	\N	\N	\N	2026-04-06 00:00:04.228662	+525515354742	2026-04-03 14:59:35.187666	2026-04-06 22:13:21.947682	\N
usr_yytk7jgtb	luis_puga@live.com.mx	Luis Puga	$2b$10$r9rRjfZ7HATwbJiIr8LuguAmx0AXRj.2cRSY4iwJbWlYYRNGXOKiG	student	6	0	\N	t	\N	\N	\N	\N	2026-04-06 13:59:14.723906	9991527630	2026-04-03 21:37:25.672934	2026-04-06 13:59:14.934345	\N
usr_k1bfjn3v1	denisegovel@gmail.com	Denise GÃ³mez Velasco	$2b$10$ep2W6WHELHrM1v72E9TylOmywEX5M4DjyrTYnIpqzuHrEVn7Uxneu	student	10	0	\N	t	\N	\N	\N	\N	2026-04-05 23:23:23.122253	9631431274	2026-04-03 20:39:11.681357	2026-04-08 12:45:29.755156	\N
usr_a80ajrgrh	majogno96@gmail.com	Maria Jose Gutierrez Novoa	$2b$10$jZgVVZuZiB/HbtoZCCi3qu3qQ7LAK67rlLvbyj8IKdKxLkLIBv8Xy	student	10	0	\N	t	\N	\N	\N	\N	\N	+529991412140	2026-04-03 15:24:00.877705	2026-04-05 22:04:37.869566	\N
usr_tqs18a3z8	taniatorres.rojas@hotmail.com	Tania Torres	$2b$10$xIrSJjq5aHcWZoH1t8UiUeIzdVoO8amvU7.ujAQv5TM.FhjDQPmCS	student	9	0	\N	t	\N	\N	\N	\N	2026-04-05 22:33:59.326248	+529993355922	2026-04-03 14:45:16.250557	2026-04-06 14:43:42.008339	\N
usr_lgd7ckv81	rafavilla_r@hotmail.com	Rafael Villa Reyes	$2b$10$mjQGEOAzpyFrHwuOaSjJ5eBBjmczOPQRQ68Knsl5A0U1KSM.XQ/tm	student	33	0	\N	t	\N	\N	\N	\N	\N	9932220417	2026-04-03 13:42:24.910587	2026-04-05 22:15:02.424663	2026-04-05 22:15:02.424663
usr_z1eunklgk	valecos_18@hotmail.com	Valeria Galicia Palafox	$2b$10$DdYghQo47LAGUCf3WTjRfuJLa9eTey5q37H8ZCjthx4Pa5olQkYRO	student	5	0	\N	t	\N	\N	\N	\N	2026-04-06 00:45:54.076175	9991092061	2026-04-06 00:23:26.723334	2026-04-06 15:24:50.996719	\N
usr_lqyksu90m	marifervelacarr@gmail.com	Maria Fernanda Vela	$2b$10$MmwlyyjBC5kaUtHT6nQSOuOXq1BMlP5h9JeFOceoU2yUDDl9HjPWG	student	6	0	\N	t	\N	\N	\N	\N	2026-04-05 22:31:55.952464	9992163653	2026-04-03 16:08:11.660559	2026-04-08 14:39:08.545964	\N
usr_qfa7cpkag	aawe95@hotmail.com	Amir Alim Awe	$2b$10$OvUdoW5JBEpgOb0t500EUOLaLei5hkxWcVXC2vUj6JRHroMfs64DW	student	17	0	\N	t	\N	\N	\N	\N	2026-04-05 22:18:59.702602	9994123218	2026-04-03 13:05:30.229033	2026-04-06 15:30:57.461034	\N
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
res_8d58b8v3l	usr_i15nihhvn	cls_czrb40f0p	subs_5t94xc9gn	sb_p86robqpy	cancelled	cancelacion_usuario	\N	0	0	2026-04-03 12:33:52.479407	2026-04-03 12:36:33.800182	\N
res_7xievkubu	usr_qfa7cpkag	cls_y014kvlwf	subs_1t7t46sup	sb_xohyksa76	active	\N	\N	0	0	2026-04-05 22:18:59.825394	2026-04-05 22:18:59.825394	\N
res_l4kk6vbgg	usr_lqyksu90m	cls_y014kvlwf	subs_cp231eyf6	sb_sbu6lboul	active	\N	\N	0	0	2026-04-05 22:31:56.052736	2026-04-05 22:31:56.052736	\N
res_ltdt1m7dl	usr_tqs18a3z8	cls_y014kvlwf	subs_wyrbe5g31	sb_u8dwkxh5k	active	\N	\N	0	0	2026-04-05 22:33:59.515299	2026-04-05 22:33:59.515299	\N
res_vbcx2b1nh	usr_5n3wyz7w3	cls_egvbmhlx8	subs_yxamux1kf	sb_h70skrv8z	active	\N	\N	0	0	2026-04-05 22:35:42.279371	2026-04-05 22:35:42.279371	\N
res_fg2rqvtta	usr_i15nihhvn	cls_y014kvlwf	subs_5t94xc9gn	sb_p86robqpy	cancelled	cancelacion_usuario	\N	0	0	2026-04-05 22:40:04.513161	2026-04-05 22:41:44.165199	\N
res_ya9vh0iiw	usr_i15nihhvn	cls_g8wu68o38	subs_5t94xc9gn	sb_p86robqpy	cancelled	cancelacion_usuario	\N	0	0	2026-04-05 22:48:20.485222	2026-04-05 23:26:11.180412	\N
res_holcmwf0e	usr_k1bfjn3v1	cls_i4rzptnm6	subs_41dunlkxy	sb_pp4edgrev	active	\N	\N	0	0	2026-04-05 23:26:30.529479	2026-04-05 23:26:30.529479	\N
res_7d5cx76jt	usr_qfa7cpkag	cls_lurybhf5s	subs_1t7t46sup	sb_xohyksa76	active	\N	\N	0	0	2026-04-05 23:43:38.993392	2026-04-05 23:43:38.993392	\N
res_zqndh49zq	usr_tfdafaulh	cls_y014kvlwf	subs_vmzue8ced	sb_jwtqupykc	active	\N	\N	0	0	2026-04-06 00:00:04.529723	2026-04-06 00:00:04.529723	\N
res_s2zw14mtb	usr_k1bfjn3v1	cls_g8wu68o38	subs_41dunlkxy	sb_pp4edgrev	cancelled	cancelacion_clase_coach	2026-04-06 00:22:17.909314	1	1	2026-04-05 23:23:23.295257	2026-04-06 00:22:17.909314	\N
res_jrpui918w	usr_3k34pmfmf	cls_g8wu68o38	subs_cg9mm8cnz	sb_959lalbdh	cancelled	cancelacion_clase_coach	2026-04-06 00:22:17.909314	1	1	2026-04-05 23:25:16.393168	2026-04-06 00:22:17.909314	\N
res_jjtd24vsu	usr_k1bfjn3v1	cls_egvbmhlx8	subs_41dunlkxy	sb_pp4edgrev	active	\N	\N	0	0	2026-04-06 00:31:43.501824	2026-04-06 00:31:43.501824	\N
res_ef0kyjzpm	usr_i15nihhvn	cls_egvbmhlx8	subs_5t94xc9gn	sb_p86robqpy	active	\N	\N	0	0	2026-04-06 10:59:16.73416	2026-04-06 10:59:16.73416	\N
res_4mq944f7i	usr_tqs18a3z8	cls_lurybhf5s	subs_wyrbe5g31	sb_u8dwkxh5k	active	\N	\N	0	0	2026-04-06 12:46:10.741126	2026-04-06 12:46:10.741126	\N
res_cusu5lyka	usr_tqs18a3z8	cls_ow421ghxt	subs_wyrbe5g31	sb_u8dwkxh5k	active	\N	\N	0	0	2026-04-06 12:46:52.6521	2026-04-06 12:46:52.6521	\N
res_810z91z22	usr_tqs18a3z8	cls_tyva5t5fi	subs_wyrbe5g31	sb_u8dwkxh5k	active	\N	\N	0	0	2026-04-06 12:47:32.072805	2026-04-06 12:47:32.072805	\N
res_h1hdvxq8w	usr_tqs18a3z8	cls_amxay95y7	subs_wyrbe5g31	sb_u8dwkxh5k	cancelled	cancelacion_usuario	\N	0	0	2026-04-06 12:47:14.667014	2026-04-06 12:49:30.364509	\N
res_t0an84ya8	usr_tqs18a3z8	cls_grsf4unv9	subs_wyrbe5g31	sb_u8dwkxh5k	cancelled	cancelacion_usuario	\N	0	0	2026-04-06 12:49:36.76436	2026-04-06 12:51:06.40059	\N
res_l9cvuczxt	usr_5b92foz1t	cls_egvbmhlx8	subs_4ilul3uks	sb_e0wz7utjr	active	\N	\N	0	0	2026-04-06 13:50:19.815346	2026-04-06 13:50:19.815346	\N
res_0gfaf6dj1	usr_yytk7jgtb	cls_y014kvlwf	subs_0n1exa3u0	sb_5dlx0bq4v	active	\N	\N	0	0	2026-04-06 13:59:14.859341	2026-04-06 13:59:14.859341	\N
res_cpuxwgp4t	usr_tqs18a3z8	cls_jb2patv49	subs_wyrbe5g31	sb_u8dwkxh5k	active	\N	\N	0	0	2026-04-06 14:43:41.968605	2026-04-06 14:43:41.968605	\N
res_lpcd4ahvb	usr_z1eunklgk	cls_dmbdsztor	subs_42ynvjwwf	sb_qbkswk3iw	cancelled	cancelacion_usuario	\N	0	0	2026-04-06 00:45:54.247405	2026-04-06 15:24:18.561952	\N
res_h21ydc0qk	usr_z1eunklgk	cls_i4rzptnm6	subs_42ynvjwwf	sb_qbkswk3iw	active	\N	\N	0	0	2026-04-06 15:24:50.96407	2026-04-06 15:24:50.96407	\N
res_9daqxqjrt	usr_qfa7cpkag	cls_pb9zzqq0q	subs_1t7t46sup	sb_xohyksa76	cancelled	cancelacion_usuario	\N	0	0	2026-04-05 23:44:41.458157	2026-04-06 15:30:26.171653	\N
res_ckv0v5vkv	usr_qfa7cpkag	cls_a67or49eg	subs_1t7t46sup	sb_xohyksa76	active	\N	\N	0	0	2026-04-06 15:30:57.446545	2026-04-06 15:30:57.446545	\N
res_3nleifwzz	usr_3k34pmfmf	cls_egvbmhlx8	subs_cg9mm8cnz	sb_959lalbdh	active	\N	\N	0	0	2026-04-06 16:45:35.202855	2026-04-06 16:45:35.202855	\N
res_suawkdlqm	usr_o09jxlrjj	cls_i4rzptnm6	subs_txe9k0ixs	sb_vtlkrmjgd	active	\N	\N	0	0	2026-04-06 18:00:43.967374	2026-04-06 18:00:43.967374	\N
res_un3d3s52i	usr_cxw8rx23c	cls_i4rzptnm6	subs_sdu87yve7	sb_51hcglceo	active	\N	\N	0	0	2026-04-06 20:34:54.722369	2026-04-06 20:34:54.722369	\N
res_zp885cbhk	usr_cxw8rx23c	cls_jb2patv49	subs_sdu87yve7	sb_51hcglceo	active	\N	\N	0	0	2026-04-06 20:36:11.60464	2026-04-06 20:36:11.60464	\N
res_ijvaw9in3	usr_cxw8rx23c	cls_tyva5t5fi	subs_sdu87yve7	sb_51hcglceo	active	\N	\N	0	0	2026-04-06 20:41:23.739276	2026-04-06 20:41:23.739276	\N
res_ni9rogjsf	usr_5b92foz1t	cls_i4rzptnm6	subs_4ilul3uks	sb_e0wz7utjr	active	\N	\N	0	0	2026-04-06 21:01:23.425052	2026-04-06 21:01:23.425052	\N
res_ia4scidwb	usr_3k34pmfmf	cls_i4rzptnm6	subs_cg9mm8cnz	sb_959lalbdh	active	\N	\N	0	0	2026-04-06 21:04:05.248305	2026-04-06 21:04:05.248305	\N
res_2z9m9ak2t	usr_tfdafaulh	cls_lurybhf5s	subs_vmzue8ced	sb_jwtqupykc	active	\N	\N	0	0	2026-04-06 22:13:21.935559	2026-04-06 22:13:21.935559	\N
res_yv7bi8r1r	usr_5n3wyz7w3	cls_i4rzptnm6	subs_yxamux1kf	sb_h70skrv8z	active	\N	\N	0	0	2026-04-06 23:26:41.498125	2026-04-06 23:26:41.498125	\N
res_4nke85e4c	usr_n0u99miop	cls_i4rzptnm6	subs_lm4ck6ga5	sb_jg79bgznq	active	\N	\N	0	0	2026-04-06 23:45:33.558807	2026-04-06 23:45:33.558807	\N
res_09thi2qxm	usr_n0u99miop	cls_jb2patv49	subs_lm4ck6ga5	sb_jg79bgznq	active	\N	\N	0	0	2026-04-07 13:47:43.842776	2026-04-07 13:47:43.842776	\N
res_f43axvrsa	usr_n0u99miop	cls_ow421ghxt	subs_lm4ck6ga5	sb_jg79bgznq	active	\N	\N	0	0	2026-04-07 13:48:16.749984	2026-04-07 13:48:16.749984	\N
res_krusafriu	usr_i15nihhvn	cls_ow421ghxt	subs_5t94xc9gn	sb_p86robqpy	active	\N	\N	0	0	2026-04-07 20:32:20.345764	2026-04-07 20:32:20.345764	\N
res_xglrdgflo	usr_5b92foz1t	cls_ow421ghxt	subs_4ilul3uks	sb_e0wz7utjr	active	\N	\N	0	0	2026-04-07 22:49:47.696706	2026-04-07 22:49:47.696706	\N
res_d6brhlw3u	usr_k1bfjn3v1	cls_a67or49eg	subs_41dunlkxy	sb_pp4edgrev	active	\N	\N	0	0	2026-04-08 12:45:29.711334	2026-04-08 12:45:29.711334	\N
res_0pyhs7fhy	usr_lqyksu90m	cls_pb9zzqq0q	subs_cp231eyf6	sb_sbu6lboul	cancelled	cancelacion_usuario	\N	0	0	2026-04-07 16:34:20.91654	2026-04-08 14:38:34.794918	\N
res_5vsodj9ex	usr_lqyksu90m	cls_a67or49eg	subs_cp231eyf6	sb_sbu6lboul	active	\N	\N	0	0	2026-04-08 14:39:08.532729	2026-04-08 14:39:08.532729	\N
res_lbx5ym8o3	usr_n0u99miop	cls_tyva5t5fi	subs_lm4ck6ga5	sb_jg79bgznq	active	\N	\N	0	0	2026-04-08 15:02:42.818482	2026-04-08 15:02:42.818482	\N
res_yl2y36vct	usr_5n3wyz7w3	cls_a67or49eg	subs_yxamux1kf	sb_h70skrv8z	active	\N	\N	0	0	2026-04-08 15:15:24.574092	2026-04-08 15:15:24.574092	\N
res_db847asb5	usr_l9bj7v0ry	cls_jb2patv49	subs_ig9ftay8a	sb_129rwi30b	active	\N	\N	0	0	2026-04-08 15:21:47.542094	2026-04-08 15:21:47.542094	\N
res_hsuoh7rrc	usr_i15nihhvn	cls_a67or49eg	subs_5t94xc9gn	sb_p86robqpy	active	\N	\N	0	0	2026-04-08 15:27:13.325448	2026-04-08 15:27:13.325448	\N
res_y2n2xnmxk	usr_5n3wyz7w3	cls_jb2patv49	subs_yxamux1kf	sb_h70skrv8z	active	\N	\N	0	0	2026-04-08 18:28:18.809111	2026-04-08 18:28:18.809111	\N
\.


--
-- Data for Name: suscripcion_beneficiarios; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.suscripcion_beneficiarios (id, suscripcion_id, alumno_id, es_titular, clases_asignadas, clases_restantes, estado, created_at, updated_at, deleted_at) FROM stdin;
sb_ze0a0nn7z	subs_icsdpilz2	usr_lgd7ckv81	1	20	0	active	2026-04-05 22:10:56.472509	2026-04-05 22:12:32.713939	\N
sb_p86robqpy	subs_5t94xc9gn	usr_i15nihhvn	1	12	10	active	2026-04-03 12:28:00.186771	2026-04-08 15:27:13.325448	\N
sb_5dlx0bq4v	subs_0n1exa3u0	usr_yytk7jgtb	1	8	6	active	2026-04-05 22:00:12.577103	2026-04-06 13:59:14.859341	\N
sb_vlpte71hl	subs_usqidzuur	usr_lgd7ckv81	1	9	1	active	2026-04-05 22:13:25.982847	2026-04-05 22:14:31.857505	\N
sb_u8dwkxh5k	subs_wyrbe5g31	usr_tqs18a3z8	1	23	9	active	2026-04-03 14:47:48.522366	2026-04-06 14:43:41.968605	\N
sb_h70skrv8z	subs_yxamux1kf	usr_5n3wyz7w3	1	20	2	active	2026-04-05 21:52:56.098003	2026-04-08 18:28:18.809111	\N
sb_2sd3h2hd5	subs_j5m6chexg	usr_qfa7cpkag	1	23	17	active	2026-04-03 13:55:14.342321	2026-04-03 13:59:25.083659	\N
sb_1768h85y2	subs_1hlo4ggb1	usr_lgd7ckv81	1	20	12	active	2026-04-03 14:17:48.344188	2026-04-03 14:25:28.411001	\N
sb_9f7reyvia	subs_kbq40703v	usr_lgd7ckv81	1	20	20	active	2026-04-03 14:27:16.704049	2026-04-03 14:27:16.704049	\N
sb_qbkswk3iw	subs_42ynvjwwf	usr_z1eunklgk	1	8	5	active	2026-04-06 00:40:44.512365	2026-04-06 15:24:50.96407	\N
sb_xohyksa76	subs_1t7t46sup	usr_qfa7cpkag	1	23	0	active	2026-04-03 14:06:49.120425	2026-04-06 15:30:57.446545	\N
sb_vtlkrmjgd	subs_txe9k0ixs	usr_o09jxlrjj	1	14	13	active	2026-04-06 17:56:00.300693	2026-04-06 18:00:43.967374	\N
sb_vs4huhtxr	subs_dq1zhxsp1	usr_lgd7ckv81	1	20	0	active	2026-04-03 14:28:02.052282	2026-04-03 14:33:12.147031	\N
sb_tlz99508i	subs_nk6nzhxwf	usr_lgd7ckv81	1	20	0	active	2026-04-03 14:33:50.726448	2026-04-03 14:34:35.7199	\N
sb_xjibz567z	subs_vxewn5873	usr_lgd7ckv81	1	20	0	active	2026-04-03 14:36:18.333507	2026-04-03 14:38:28.393681	\N
sb_v68t1cd7k	subs_8go3nt45r	usr_lgd7ckv81	1	20	0	active	2026-04-03 14:41:01.689465	2026-04-03 14:41:52.877741	\N
sb_51hcglceo	subs_sdu87yve7	usr_cxw8rx23c	1	9	6	active	2026-04-05 12:37:00.406972	2026-04-06 20:41:23.739276	\N
sb_7a1k1hjcs	subs_3vu39e92c	usr_lgd7ckv81	1	20	0	active	2026-04-03 14:56:08.682234	2026-04-03 14:57:36.35744	\N
sb_9szjnyspa	subs_pt6wrujgf	usr_lgd7ckv81	1	20	0	active	2026-04-03 14:58:31.760806	2026-04-03 14:59:17.552503	\N
sb_re8dpn0qp	subs_92a2py342	usr_i15nihhvn	1	20	0	active	2026-04-03 15:02:55.215125	2026-04-03 15:04:19.48035	\N
sb_959lalbdh	subs_cg9mm8cnz	usr_3k34pmfmf	1	20	13	active	2026-04-05 21:49:03.915781	2026-04-06 21:04:05.248305	\N
sb_jwtqupykc	subs_vmzue8ced	usr_tfdafaulh	1	20	2	active	2026-04-05 22:03:03.56099	2026-04-06 22:13:21.935559	\N
sb_ohgnoz26v	subs_cqdg9kctm	usr_a80ajrgrh	1	20	10	active	2026-04-05 22:04:26.09078	2026-04-05 22:04:37.858022	\N
sb_ddptm41bw	subs_t3k8091jq	usr_rjcwgh32i	1	20	18	active	2026-04-06 00:26:26.527632	2026-04-06 00:28:21.613458	\N
sb_ewe4qjc0b	subs_isg4p4wn1	usr_lgd7ckv81	1	20	0	active	2026-04-05 22:05:34.721053	2026-04-05 22:08:36.220549	\N
sb_e0wz7utjr	subs_4ilul3uks	usr_5b92foz1t	1	12	9	active	2026-04-06 13:40:40.833227	2026-04-07 22:49:47.696706	\N
sb_5oy51ojll	subs_7mgfeit0d	usr_5b92foz1t	1	12	0	active	2026-04-06 13:41:54.199687	2026-04-06 13:43:33.567647	\N
sb_ey3x933j2	subs_75jr467ea	usr_5b92foz1t	1	8	0	active	2026-04-06 13:44:34.011936	2026-04-06 13:45:12.966644	\N
sb_pp4edgrev	subs_41dunlkxy	usr_k1bfjn3v1	1	20	10	active	2026-04-05 21:47:14.597399	2026-04-08 12:45:29.711334	\N
sb_sbu6lboul	subs_cp231eyf6	usr_lqyksu90m	1	8	6	active	2026-04-05 13:28:15.843235	2026-04-08 14:39:08.532729	\N
sb_jg79bgznq	subs_lm4ck6ga5	usr_n0u99miop	1	20	8	active	2026-04-06 23:42:42.630857	2026-04-08 15:02:42.818482	\N
sb_129rwi30b	subs_ig9ftay8a	usr_l9bj7v0ry	1	20	5	active	2026-04-06 23:59:59.032143	2026-04-08 15:21:47.542094	\N
\.


--
-- Data for Name: suscripciones_alumno; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.suscripciones_alumno (id, alumno_id, paquete_id, fecha_compra, fecha_vencimiento, clases_totales, clases_restantes, clases_consumidas, estado, congelado, freeze_iniciado_en, dias_congelados, notas, created_at, updated_at, deleted_at) FROM stdin;
subs_cp231eyf6	usr_lqyksu90m	pack_base	2026-04-05 13:28:15.843235	2026-04-19 17:28:15.843	8	6	2	active	0	\N	0	\N	2026-04-05 13:28:15.843235	2026-04-08 14:39:08.532729	\N
subs_cqdg9kctm	usr_a80ajrgrh	pack_crew	2026-04-05 22:04:26.09078	2026-04-13 02:04:26.09	60	50	0	active	0	\N	0	\N	2026-04-05 22:04:26.09078	2026-04-05 22:04:37.858022	\N
subs_lm4ck6ga5	usr_n0u99miop	pack_crew	2026-04-06 23:42:42.630857	2026-04-14 03:42:42.632	20	8	4	active	0	\N	0	\N	2026-04-06 23:42:42.630857	2026-04-08 15:02:42.818482	\N
subs_j5m6chexg	usr_qfa7cpkag	pack_duo	2026-04-03 13:55:14.342321	2026-05-29 17:55:14.342	46	40	0	active	0	\N	0	\N	2026-04-03 13:55:14.342321	2026-04-03 13:59:25.083659	\N
subs_1hlo4ggb1	usr_lgd7ckv81	pack_crew	2026-04-03 14:17:48.344188	2026-06-12 18:17:48.344	60	52	0	active	0	\N	0	\N	2026-04-03 14:17:48.344188	2026-04-03 14:25:28.411001	\N
subs_kbq40703v	usr_lgd7ckv81	pack_crew	2026-04-03 14:27:16.704049	2026-04-10 18:27:16.704	60	60	0	active	0	\N	0	\N	2026-04-03 14:27:16.704049	2026-04-03 14:27:16.704049	\N
subs_isg4p4wn1	usr_lgd7ckv81	pack_crew	2026-04-05 22:05:34.721053	2026-04-13 02:05:34.721	60	40	0	active	0	\N	0	\N	2026-04-05 22:05:34.721053	2026-04-05 22:08:36.220549	\N
subs_txe9k0ixs	usr_o09jxlrjj	pack_065nu6tc0	2026-04-06 17:56:00.300693	2026-05-11 21:56:00.301	14	13	1	active	0	\N	0	\N	2026-04-06 17:56:00.300693	2026-04-06 18:00:43.967374	\N
subs_icsdpilz2	usr_lgd7ckv81	pack_crew	2026-04-05 22:10:56.472509	2026-04-13 02:10:56.472	20	0	0	active	0	\N	0	\N	2026-04-05 22:10:56.472509	2026-04-05 22:12:32.713939	\N
subs_ig9ftay8a	usr_l9bj7v0ry	pack_crew	2026-04-06 23:59:59.032143	2026-04-14 03:59:59.032	20	5	1	active	0	\N	0	\N	2026-04-06 23:59:59.032143	2026-04-08 15:21:47.542094	\N
subs_dq1zhxsp1	usr_lgd7ckv81	pack_crew	2026-04-03 14:28:02.052282	2026-04-17 18:28:02.056	60	40	0	active	0	\N	0	\N	2026-04-03 14:28:02.052282	2026-04-03 14:33:12.147031	\N
subs_5t94xc9gn	usr_i15nihhvn	pack_start	2026-04-03 12:28:00.186771	2026-05-01 16:28:00.186	12	10	4	active	0	\N	0	\N	2026-04-03 12:28:00.186771	2026-04-08 15:27:13.325448	\N
subs_nk6nzhxwf	usr_lgd7ckv81	pack_crew	2026-04-03 14:33:50.726448	2026-04-17 18:33:50.728	60	40	0	active	0	\N	0	\N	2026-04-03 14:33:50.726448	2026-04-03 14:34:35.7199	\N
subs_usqidzuur	usr_lgd7ckv81	pack_065nu6tc0	2026-04-05 22:13:25.982847	2026-04-27 02:13:25.983	9	1	0	active	0	\N	0	\N	2026-04-05 22:13:25.982847	2026-04-05 22:14:31.857505	\N
subs_sdu87yve7	usr_cxw8rx23c	pack_065nu6tc0	2026-04-05 12:37:00.406972	2026-04-26 16:37:00.408	9	6	3	active	0	\N	0	\N	2026-04-05 12:37:00.406972	2026-04-06 20:41:23.739276	\N
subs_vxewn5873	usr_lgd7ckv81	pack_crew	2026-04-03 14:36:18.333507	2026-04-17 18:36:18.333	60	40	0	active	0	\N	0	\N	2026-04-03 14:36:18.333507	2026-04-03 14:38:28.393681	\N
subs_8go3nt45r	usr_lgd7ckv81	pack_crew	2026-04-03 14:41:01.689465	2026-06-12 18:41:01.692	60	40	0	active	0	\N	0	\N	2026-04-03 14:41:01.689465	2026-04-03 14:41:52.877741	\N
subs_yxamux1kf	usr_5n3wyz7w3	pack_crew	2026-04-05 21:52:56.098003	2026-04-20 01:52:56.098	60	42	4	active	0	\N	0	\N	2026-04-05 21:52:56.098003	2026-04-08 18:28:18.809111	\N
subs_3vu39e92c	usr_lgd7ckv81	pack_crew	2026-04-03 14:56:08.682234	2026-04-17 18:56:08.682	60	40	0	active	0	\N	0	\N	2026-04-03 14:56:08.682234	2026-04-03 14:57:36.35744	\N
subs_pt6wrujgf	usr_lgd7ckv81	pack_crew	2026-04-03 14:58:31.760806	2026-04-10 18:58:31.761	60	40	0	active	0	\N	0	\N	2026-04-03 14:58:31.760806	2026-04-03 14:59:17.552503	\N
subs_cg9mm8cnz	usr_3k34pmfmf	pack_crew	2026-04-05 21:49:03.915781	2026-05-18 01:49:03.916	60	53	2	active	0	\N	0	\N	2026-04-05 21:49:03.915781	2026-04-06 21:04:05.248305	\N
subs_92a2py342	usr_i15nihhvn	pack_crew	2026-04-03 15:02:55.215125	2026-04-10 19:02:55.22	60	40	0	active	0	\N	0	\N	2026-04-03 15:02:55.215125	2026-04-03 15:04:19.48035	\N
subs_vmzue8ced	usr_tfdafaulh	pack_crew	2026-04-05 22:03:03.56099	2026-04-13 02:03:03.561	60	42	2	active	0	\N	0	\N	2026-04-05 22:03:03.56099	2026-04-06 22:13:21.935559	\N
subs_7mgfeit0d	usr_5b92foz1t	pack_start	2026-04-06 13:41:54.199687	2026-04-20 17:41:54.199	12	0	0	active	0	\N	0	\N	2026-04-06 13:41:54.199687	2026-04-06 13:43:33.567647	\N
subs_75jr467ea	usr_5b92foz1t	pack_base	2026-04-06 13:44:34.011936	2026-04-20 17:44:34.012	8	0	0	active	0	\N	0	\N	2026-04-06 13:44:34.011936	2026-04-06 13:45:12.966644	\N
subs_t3k8091jq	usr_rjcwgh32i	pack_crew	2026-04-06 00:26:26.527632	2026-04-13 04:26:26.528	20	18	0	active	0	\N	0	\N	2026-04-06 00:26:26.527632	2026-04-06 00:28:21.613458	\N
subs_0n1exa3u0	usr_yytk7jgtb	pack_base	2026-04-05 22:00:12.577103	2026-04-20 02:00:12.578	8	6	1	active	0	\N	0	\N	2026-04-05 22:00:12.577103	2026-04-06 13:59:14.859341	\N
subs_wyrbe5g31	usr_tqs18a3z8	pack_duo	2026-04-03 14:47:48.522366	2026-05-08 18:47:48.522	46	32	5	active	0	\N	0	\N	2026-04-03 14:47:48.522366	2026-04-06 14:43:41.968605	\N
subs_42ynvjwwf	usr_z1eunklgk	pack_base	2026-04-06 00:40:44.512365	2026-04-20 04:40:44.512	8	5	1	active	0	\N	0	\N	2026-04-06 00:40:44.512365	2026-04-06 15:24:50.96407	\N
subs_1t7t46sup	usr_qfa7cpkag	pack_duo	2026-04-03 14:06:49.120425	2026-05-08 18:06:49.12	46	23	3	active	0	\N	0	\N	2026-04-03 14:06:49.120425	2026-04-06 15:30:57.446545	\N
subs_4ilul3uks	usr_5b92foz1t	pack_start	2026-04-06 13:40:40.833227	2026-05-04 17:40:40.833	12	9	3	active	0	\N	0	\N	2026-04-06 13:40:40.833227	2026-04-07 22:49:47.696706	\N
subs_41dunlkxy	usr_k1bfjn3v1	pack_crew	2026-04-05 21:47:14.597399	2026-05-18 01:47:14.597	60	50	3	active	0	\N	0	\N	2026-04-05 21:47:14.597399	2026-04-08 12:45:29.711334	\N
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.system_settings (setting_key, setting_value, updated_at) FROM stdin;
cancellation_cutoff_morning	08:00	2026-04-02 15:54:39.58634
cancellation_deadline_evening	22:00	2026-04-02 15:54:39.587765
cancellation_limit_hours	3	2026-04-02 15:54:39.588631
\.


--
-- Data for Name: transacciones_pago; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.transacciones_pago (id, suscripcion_id, alumno_id, paquete_id, monto, moneda, metodo_pago, referencia, fecha_pago, created_at, updated_at, deleted_at) FROM stdin;
pay_f3z0j189v	subs_5t94xc9gn	usr_i15nihhvn	pack_start	899	MXN	transferencia	\N	2026-04-03 12:28:00.186771	2026-04-03 12:28:00.186771	2026-04-03 12:28:00.186771	\N
pay_tx4eisnyd	subs_j5m6chexg	usr_qfa7cpkag	pack_duo	3375	MXN	transferencia	\N	2026-04-03 13:55:14.342321	2026-04-03 13:55:14.342321	2026-04-03 13:55:14.342321	\N
pay_23mwjmlh1	subs_1t7t46sup	usr_qfa7cpkag	pack_duo	3375	MXN	transferencia	\N	2026-04-03 14:06:49.120425	2026-04-03 14:06:49.120425	2026-04-03 14:06:49.120425	\N
pay_oe7in17av	subs_1hlo4ggb1	usr_lgd7ckv81	pack_crew	4050	MXN	transferencia	\N	2026-04-03 14:17:48.344188	2026-04-03 14:17:48.344188	2026-04-03 14:17:48.344188	\N
pay_qg7oyqnzq	subs_kbq40703v	usr_lgd7ckv81	pack_crew	4050	MXN	transferencia	\N	2026-04-03 14:27:16.704049	2026-04-03 14:27:16.704049	2026-04-03 14:27:16.704049	\N
pay_mies0wyu7	subs_dq1zhxsp1	usr_lgd7ckv81	pack_crew	4050	MXN	transferencia	\N	2026-04-03 14:28:02.052282	2026-04-03 14:28:02.052282	2026-04-03 14:28:02.052282	\N
pay_ozvpj9j68	subs_nk6nzhxwf	usr_lgd7ckv81	pack_crew	4050	MXN	transferencia	\N	2026-04-03 14:33:50.726448	2026-04-03 14:33:50.726448	2026-04-03 14:33:50.726448	\N
pay_xuuy8ms8x	subs_vxewn5873	usr_lgd7ckv81	pack_crew	4050	MXN	transferencia	\N	2026-04-03 14:36:18.333507	2026-04-03 14:36:18.333507	2026-04-03 14:36:18.333507	\N
pay_njzddhtdc	subs_8go3nt45r	usr_lgd7ckv81	pack_crew	4050	MXN	transferencia	\N	2026-04-03 14:41:01.689465	2026-04-03 14:41:01.689465	2026-04-03 14:41:01.689465	\N
pay_fczez4rn4	subs_wyrbe5g31	usr_tqs18a3z8	pack_duo	3375	MXN	transferencia	\N	2026-04-03 14:47:48.522366	2026-04-03 14:47:48.522366	2026-04-03 14:47:48.522366	\N
pay_i77sawbo6	subs_3vu39e92c	usr_lgd7ckv81	pack_crew	4050	MXN	transferencia	\N	2026-04-03 14:56:08.682234	2026-04-03 14:56:08.682234	2026-04-03 14:56:08.682234	\N
pay_s7imuuer0	subs_pt6wrujgf	usr_lgd7ckv81	pack_crew	4050	MXN	transferencia	\N	2026-04-03 14:58:31.760806	2026-04-03 14:58:31.760806	2026-04-03 14:58:31.760806	\N
pay_49vrnnbow	subs_92a2py342	usr_i15nihhvn	pack_crew	4050	MXN	transferencia	\N	2026-04-03 15:02:55.215125	2026-04-03 15:02:55.215125	2026-04-03 15:02:55.215125	\N
pay_r40j3o1nu	subs_sdu87yve7	usr_cxw8rx23c	pack_065nu6tc0	1134	MXN	transferencia	\N	2026-04-05 12:37:00.406972	2026-04-05 12:37:00.406972	2026-04-05 12:37:00.406972	\N
pay_cfwxhl22j	subs_cp231eyf6	usr_lqyksu90m	pack_base	1035	MXN	efectivo	\N	2026-04-05 13:28:15.843235	2026-04-05 13:28:15.843235	2026-04-05 13:28:15.843235	\N
pay_ef7s424jb	subs_41dunlkxy	usr_k1bfjn3v1	pack_crew	4050	MXN	transferencia	\N	2026-04-05 21:47:14.597399	2026-04-05 21:47:14.597399	2026-04-05 21:47:14.597399	\N
pay_zago8zpap	subs_cg9mm8cnz	usr_3k34pmfmf	pack_crew	4050	MXN	transferencia	\N	2026-04-05 21:49:03.915781	2026-04-05 21:49:03.915781	2026-04-05 21:49:03.915781	\N
pay_461zv56yq	subs_yxamux1kf	usr_5n3wyz7w3	pack_crew	4050	MXN	transferencia	\N	2026-04-05 21:52:56.098003	2026-04-05 21:52:56.098003	2026-04-05 21:52:56.098003	\N
pay_s42t5uhmn	subs_0n1exa3u0	usr_yytk7jgtb	pack_base	1035	MXN	transferencia	\N	2026-04-05 22:00:12.577103	2026-04-05 22:00:12.577103	2026-04-05 22:00:12.577103	\N
pay_qvk9h87n3	subs_vmzue8ced	usr_tfdafaulh	pack_crew	4050	MXN	transferencia	\N	2026-04-05 22:03:03.56099	2026-04-05 22:03:03.56099	2026-04-05 22:03:03.56099	\N
pay_lg6v0mjn9	subs_cqdg9kctm	usr_a80ajrgrh	pack_crew	4050	MXN	transferencia	\N	2026-04-05 22:04:26.09078	2026-04-05 22:04:26.09078	2026-04-05 22:04:26.09078	\N
pay_2cru42elo	subs_isg4p4wn1	usr_lgd7ckv81	pack_crew	4050	MXN	transferencia	\N	2026-04-05 22:05:34.721053	2026-04-05 22:05:34.721053	2026-04-05 22:05:34.721053	\N
pay_aaa6ov0st	subs_icsdpilz2	usr_lgd7ckv81	pack_crew	4050	MXN	transferencia	\N	2026-04-05 22:10:56.472509	2026-04-05 22:10:56.472509	2026-04-05 22:10:56.472509	\N
pay_cgm4mou54	subs_usqidzuur	usr_lgd7ckv81	pack_065nu6tc0	1134	MXN	transferencia	\N	2026-04-05 22:13:25.982847	2026-04-05 22:13:25.982847	2026-04-05 22:13:25.982847	\N
pay_tz3klqkfj	subs_t3k8091jq	usr_rjcwgh32i	pack_crew	4050	MXN	transferencia	\N	2026-04-06 00:26:26.527632	2026-04-06 00:26:26.527632	2026-04-06 00:26:26.527632	\N
pay_ibtap3foj	subs_42ynvjwwf	usr_z1eunklgk	pack_base	1035	MXN	transferencia	\N	2026-04-06 00:40:44.512365	2026-04-06 00:40:44.512365	2026-04-06 00:40:44.512365	\N
pay_a7p4vt1nc	subs_4ilul3uks	usr_5b92foz1t	pack_start	899	MXN	transferencia	\N	2026-04-06 13:40:40.833227	2026-04-06 13:40:40.833227	2026-04-06 13:40:40.833227	\N
pay_mp21gpqjm	subs_7mgfeit0d	usr_5b92foz1t	pack_start	899	MXN	transferencia	\N	2026-04-06 13:41:54.199687	2026-04-06 13:41:54.199687	2026-04-06 13:41:54.199687	\N
pay_18hhhlics	subs_75jr467ea	usr_5b92foz1t	pack_base	1035	MXN	transferencia	\N	2026-04-06 13:44:34.011936	2026-04-06 13:44:34.011936	2026-04-06 13:44:34.011936	\N
pay_2hjhwzb22	subs_txe9k0ixs	usr_o09jxlrjj	pack_065nu6tc0	1260	MXN	transferencia	\N	2026-04-06 17:56:00.300693	2026-04-06 17:56:00.300693	2026-04-06 17:56:00.300693	\N
pay_l00bdul4y	subs_lm4ck6ga5	usr_n0u99miop	pack_crew	4050	MXN	transferencia	\N	2026-04-06 23:42:42.630857	2026-04-06 23:42:42.630857	2026-04-06 23:42:42.630857	\N
pay_eak8xcmb2	subs_ig9ftay8a	usr_l9bj7v0ry	pack_crew	4050	MXN	transferencia	\N	2026-04-06 23:59:59.032143	2026-04-06 23:59:59.032143	2026-04-06 23:59:59.032143	\N
\.


--
-- Data for Name: whatsapp_templates; Type: TABLE DATA; Schema: public; Owner: cabreu145_focusfitness_user
--

COPY public.whatsapp_templates (id, name, body, is_default_cancellation, is_active, created_by, updated_by, created_at, updated_at) FROM stdin;
watpl_cx3b4u4y9	clases vencimiento	hola{{nombre_alumno}} tu paquete {{fecha_vencimiento_paquete}}{{fecha_cancelacion}} gracias	0	1	coach	coach	2026-04-03 12:24:55.078167	2026-04-03 12:24:55.078167
watpl_befvnyfac	Paquete por vencer	Hola {{nombre_alumno}} tu {{paquete_actual}} le quedan #{{creditos_restantes}} crÃ©dito/s . Te quedan {{dias_para_vencer}} dÃ­a/s\nde vencimiento. Te recordamos que la fecha de vencimiento es el {{fecha_vencimiento_paquete}}.\nAtte:{{FOCUS FITNESS }}	0	1	coach	coach	2026-04-02 16:04:24.451045	2026-04-06 01:47:09.677532
watpl_wpqul304k	Verifica tu correo	Hola {{nombre_alumno}} Hemos visto que tu correo {{email_alumno}} {{email_verificado}} se encuentra verificado.\nPor favor revisa tu Bandeja de entrada o de correo no deseado.	0	1	coach	coach	2026-04-07 14:09:10.508256	2026-04-07 14:15:10.409719
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
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- Name: TABLE ajustes_credito; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.ajustes_credito TO cabreu145_focusfitness;


--
-- Name: TABLE class_types; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.class_types TO cabreu145_focusfitness;


--
-- Name: TABLE classes; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.classes TO cabreu145_focusfitness;


--
-- Name: TABLE paquetes; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.paquetes TO cabreu145_focusfitness;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.profiles TO cabreu145_focusfitness;


--
-- Name: TABLE registros_asistencia; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.registros_asistencia TO cabreu145_focusfitness;


--
-- Name: TABLE reservations; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.reservations TO cabreu145_focusfitness;


--
-- Name: TABLE suscripcion_beneficiarios; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.suscripcion_beneficiarios TO cabreu145_focusfitness;


--
-- Name: TABLE suscripciones_alumno; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.suscripciones_alumno TO cabreu145_focusfitness;


--
-- Name: TABLE system_settings; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.system_settings TO cabreu145_focusfitness;


--
-- Name: TABLE transacciones_pago; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.transacciones_pago TO cabreu145_focusfitness;


--
-- Name: TABLE whatsapp_templates; Type: ACL; Schema: public; Owner: cabreu145_focusfitness_user
--

GRANT ALL ON TABLE public.whatsapp_templates TO cabreu145_focusfitness;


--
-- PostgreSQL database dump complete
--

