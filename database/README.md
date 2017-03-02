# Database-related source code

## Steps
First, aim for connectivity data.
Secondly, aim for metadata of each item.

## Commands

### login via psql
psql ijah  -h 127.0.0.1 -d ijah

### dump
$ sudo -u ijah pg_dump ijah > ijah.sql
ijah=> \copy protein to /home/tor/protein.csv csv header
ijah=> \copy (SELECT com_cas_id FROM compound) TO '/home/tor/tmp/test.csv' With CSV;

### import
psql ijah  -h 127.0.0.1 -d ijah < ijah_201612141709.sql

### apps.cs
sudo -u postgres psql mydb
sudo -u postgres createdb mydb
sudo -u postgres createuser tor
sudo -u postgres dropdb ijah
sudo -u postgres psql
postgres=# \password [role]

## Queries

ALTER SEQUENCE [tablename]_[id]_seq RESTART WITH 1
ALTER SEQUENCE user_msg_id_seq RESTART WITH 1;

ALTER TABLE compound DROP COLUMN com_simcomp;
ALTER TABLE plant ADD COLUMN pla_idr_name varchar(256);
ALTER TABLE protein ADD COLUMN pro_pdb_id text;
ALTER TABLE compound ADD COLUMN com_iupac_name varchar(16384);
ALTER TABLE compound ADD COLUMN com_pubchem_name varchar(512);
ALTER TABLE compound ADD COLUMN com_smiles_canonical varchar(32768);
ALTER TABLE compound ADD COLUMN com_smiles_isomeric varchar(32768);
ALTER TABLE compound ADD COLUMN com_pubchem_synonym text;
ALTER TABLE compound ADD COLUMN com_pubchem_id varchar(128);
ALTER TABLE compound ADD COLUMN com_inchikey varchar(2048)

SELECT COUNT(DISTINCT (c.com_id)) from compound as c ,plant_vs_compound as pc where c.com_id=pc.com_id;

SELECT
count(distinct plant.pla_id)
FROM
plant
LEFT JOIN
plant_vs_compound
ON
plant.pla_id = plant_vs_compound.pla_id
WHERE
plant_vs_compound.pla_id IS NULL;

SELECT
count(distinct compound.com_id)
FROM
compound
LEFT JOIN
plant_vs_compound
ON
compound.com_id = plant_vs_compound.com_id
WHERE
plant_vs_compound.com_id IS NULL;

SELECT
count(distinct compound.com_id)
FROM
compound
LEFT JOIN
plant_vs_compound
ON
compound.com_id = plant_vs_compound.com_id
WHERE
plant_vs_compound.com_id IS NOT NULL;

SELECT
distinct compound.com_id,compound.com_cas_id
FROM
compound
LEFT JOIN
plant_vs_compound
ON
compound.com_id = plant_vs_compound.com_id
WHERE
plant_vs_compound.com_id IS NOT NULL
LIMIT 5;

SELECT
count(distinct protein.pro_id)
FROM
protein
LEFT JOIN
protein_vs_disease
ON
protein.pro_id = protein_vs_disease.pro_id
WHERE
protein_vs_disease.pro_id IS NULL;

SELECT
count(distinct disease.dis_id)
FROM
disease
LEFT JOIN
protein_vs_disease
ON
disease.dis_id = protein_vs_disease.dis_id
WHERE
protein_vs_disease.dis_id IS NULL;

DELETE FROM plant where pla_id IN (
SELECT
distinct plant.pla_id
FROM
plant
LEFT JOIN
plant_vs_compound
ON
plant.pla_id = plant_vs_compound.pla_id
WHERE
plant_vs_compound.pla_id IS NULL
);

DELETE FROM compound where com_id IN (
SELECT
distinct compound.com_id
FROM
compound
LEFT JOIN
plant_vs_compound
ON
compound.com_id = plant_vs_compound.com_id
WHERE
plant_vs_compound.com_id IS NULL
);