-- HORTONWORKS DATAPLANE SERVICE AND ITS CONSTITUENT SERVICES
-- (c) 2016-2018 Hortonworks, Inc. All rights reserved.
-- This code is provided to you pursuant to your written agreement with Hortonworks, which may be the terms of the
-- Affero General Public License version 3 (AGPLv3), or pursuant to a written agreement with a third party authorized
-- to distribute this code.  If you do not have a written agreement with Hortonworks or with an authorized and
-- properly licensed third party, you do not have any rights to this code.
-- If this code is provided to you under the terms of the AGPLv3:
--   (A) HORTONWORKS PROVIDES THIS CODE TO YOU WITHOUT WARRANTIES OF ANY KIND;
-- (B) HORTONWORKS DISCLAIMS ANY AND ALL EXPRESS AND IMPLIED WARRANTIES WITH RESPECT TO THIS CODE, INCLUDING BUT NOT
-- LIMITED TO IMPLIED WARRANTIES OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE;
-- (C) HORTONWORKS IS NOT LIABLE TO YOU, AND WILL NOT DEFEND, INDEMNIFY, OR HOLD YOU HARMLESS FOR ANY CLAIMS ARISING
-- FROM OR RELATED TO THE CODE; AND
-- (D) WITH RESPECT TO YOUR EXERCISE OF ANY RIGHTS GRANTED TO YOU FOR THE CODE, HORTONWORKS IS NOT LIABLE FOR ANY
-- DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE OR CONSEQUENTIAL DAMAGES INCLUDING, BUT NOT LIMITED TO,
-- DAMAGES RELATED TO LOST REVENUE, LOST PROFITS, LOSS OF INCOME, LOSS OF BUSINESS ADVANTAGE OR UNAVAILABILITY,
-- OR LOSS OR CORRUPTION OF DATA.

CREATE TABLE IF NOT EXISTS dss.users (
  id        BIGINT  PRIMARY KEY,
  user_name    VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS dss.categories (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS dss.datasets (
  id           BIGSERIAL PRIMARY KEY,
  name         VARCHAR(255)                                       NOT NULL,
  description  TEXT,
  dp_clusterid BIGINT                                             NOT NULL,
  createdby    BIGINT REFERENCES dss.users (id)                   NOT NULL,
  createdon    TIMESTAMP DEFAULT now()                            NOT NULL,
  lastmodified TIMESTAMP DEFAULT now()                            NOT NULL,
  active       BOOLEAN DEFAULT TRUE,
  version      SMALLINT DEFAULT 0,
  sharedstatus SMALLINT DEFAULT 1   -- enum 1 - Public, 2 - Private
);
CREATE INDEX idx_dp_dataset_active on dss.datasets(id) WHERE active;

CREATE TABLE IF NOT EXISTS dss.dataset_categories (
  category_id BIGINT REFERENCES dss.categories (id) ON DELETE CASCADE NOT NULL,
  dataset_id  BIGINT REFERENCES dss.datasets (id) ON DELETE CASCADE NOT NULL
);

CREATE TABLE IF NOT EXISTS dss.dataset_edit_details (
  id           BIGSERIAL PRIMARY KEY,
  dataset_id   BIGINT REFERENCES dss.datasets (id)              NOT NULL,
  edited_by    BIGINT REFERENCES dss.users (id)                 NOT NULL,
  edit_begin   TIMESTAMP DEFAULT now()                          NOT NULL
);

CREATE TABLE IF NOT EXISTS dss.data_asset (
  id               BIGSERIAL PRIMARY KEY,
  asset_type       VARCHAR(100) NOT NULL,
  asset_name       TEXT        NOT NULL,
  guid             VARCHAR(100) NOT NULL,
  asset_properties JSON       NOT NULL,
  state             VARCHAR(32) NOT NULL DEFAULT 'Edit',
  edit_flag         VARCHAR(32)  NOT NULL DEFAULT 'Mark_Add',
  dataset_id       BIGINT REFERENCES dss.datasets (id) ON DELETE CASCADE DEFAULT NULL,
  cluster_id       BIGINT    NOT NULL,

  CHECK (state IN ('Active','Edit')),
  CHECK (edit_flag IN ('Mark_Add','Mark_Delete')),
  CONSTRAINT unique_guid_and_dataset_id_constraint UNIQUE (guid, dataset_id)
);
CREATE INDEX idx_dp_data_asset_guid on dss.data_asset(guid);


CREATE TABLE IF NOT EXISTS dss.comments (
  id           BIGSERIAL PRIMARY KEY,
  comment      TEXT,
  object_type  VARCHAR(64)                                           NOT NULL,
  object_id    BIGINT                                                 NOT NULL,
  createdby    BIGINT REFERENCES dss.users (id)                 NOT NULL,
  createdon    TIMESTAMP DEFAULT now(),
  lastmodified TIMESTAMP DEFAULT now(),
  parent_comment_id  BIGINT REFERENCES dss.comments(id)         ON DELETE CASCADE DEFAULT NULL,
  edit_version BIGINT DEFAULT 0
);

--Index on comments table
CREATE INDEX idx_dss_comments_parent_id on dss.comments(parent_comment_id);
CREATE INDEX idx_dss_comments_objId_objType on dss.comments(object_id, object_type);

CREATE TABLE IF NOT EXISTS dss.bookmarks (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES dss.users (id)                 NOT NULL,
  object_type  VARCHAR(64)               NOT NULL,
  object_id  BIGINT                       NOT NULL,

  CONSTRAINT bm_unique_userId_objId_objType_constraint UNIQUE (user_id, object_id,object_type)
);
--Index on bookmarks table
CREATE INDEX idx_dss_bookmarks_user_id on dss.bookmarks(user_id);
CREATE INDEX idx_dss_bookmarks_objId_objType on dss.bookmarks(object_id, object_type);

CREATE TABLE IF NOT EXISTS dss.ratings (
  id           BIGSERIAL PRIMARY KEY,
  rating       DECIMAL(2,1)                                           NOT NULL,
  object_type  VARCHAR(64)                                           NOT NULL,
  object_id    BIGINT                                                 NOT NULL,
  createdby    BIGINT REFERENCES dss.users (id)                 NOT NULL,

  CONSTRAINT unique_creator_objId_objType_constraint UNIQUE (createdby, object_id,object_type)
);

CREATE TABLE IF NOT EXISTS dss.favourites (
  id           BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES dss.users (id)                 NOT NULL,
  object_type  VARCHAR(64)                                         NOT NULL,
  object_id  BIGINT                                       NOT NULL,

  CONSTRAINT fav_unique_userId_objId_objType_constraint UNIQUE (user_id, object_id,object_type)
);

--Index on favourites table
CREATE INDEX idx_dss_favourites_user_id on dss.favourites(user_id);
CREATE INDEX idx_dss_favourites_objId_objType on dss.favourites(object_id, object_type);

CREATE TABLE IF NOT EXISTS dss.csp_rules (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(255)                      NOT NULL UNIQUE,
  description   TEXT,
  creator_id    BIGINT REFERENCES dss.users (id)  NOT NULL,
  dsl           TEXT                              NOT NULL,
  type          VARCHAR(32)                       NOT NULL       DEFAULT 'Custom',
  status        VARCHAR(32)                       NOT NULL       DEFAULT 'New',

  CHECK (type IN ('System','Custom'))
);

CREATE TABLE IF NOT EXISTS dss.csp_rule_cluster_id (
  id            BIGSERIAL PRIMARY KEY,
  rule_id       BIGINT REFERENCES dss.csp_rules (id)    NOT NULL,  -- Do not cascade on rule delete
  cluster_id    BIGINT                                  NOT NULL,

  CONSTRAINT unique_csp_rule_cluster_id_constraint UNIQUE (rule_id, cluster_id)
);

CREATE TABLE IF NOT EXISTS dss.classifications (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(100)                      NOT NULL UNIQUE,
  type          VARCHAR(32)                       NOT NULL       DEFAULT 'Custom',

  CHECK (type IN ('System','Custom'))
);

CREATE TABLE IF NOT EXISTS dss.csp_rule_classification (
  id                    BIGSERIAL PRIMARY KEY,
  rule_id               BIGINT REFERENCES dss.csp_rules (id)        ON DELETE CASCADE NOT NULL,
  classification_id     BIGINT REFERENCES dss.classifications (id)  ON DELETE CASCADE NOT NULL,

  CONSTRAINT unique_csp_rule_classification_constraint UNIQUE (rule_id, classification_id)
);

CREATE TABLE IF NOT EXISTS dss.csp_resources (
  id                    BIGSERIAL PRIMARY KEY,
  type                  VARCHAR(255) NOT NULL,
  value                 TEXT,
  name                  VARCHAR(255) NOT NULL UNIQUE,
  reference             VARCHAR(255) UNIQUE,
  filecontent           BYTEA,
  description           TEXT,
  creator_id            BIGINT REFERENCES dss.users (id)  NOT NULL,
  created               TIMESTAMP DEFAULT now() NOT NULL,
  modified              TIMESTAMP DEFAULT now() NOT NULL,
  meta_properties       JSON,
  sample_data           TEXT,
  source                TEXT
);

CREATE INDEX idx_csp_resources_reference on dss.csp_resources(reference);

CREATE TABLE IF NOT EXISTS dss.cspresources_csprules (
  id                    BIGSERIAL PRIMARY KEY,
  resource_id           BIGINT REFERENCES dss.csp_resources (id)            NOT NULL, -- Do not cascade on resource delete
  rule_id               BIGINT REFERENCES dss.csp_rules (id)                ON DELETE CASCADE NOT NULL,

  CONSTRAINT unique_cspresources_csprules_constraint UNIQUE (resource_id, rule_id)
);

CREATE TABLE IF NOT EXISTS dss.csp_tests (
  id                    BIGSERIAL PRIMARY KEY,
  name_data             TEXT NOT NULL,
  value_data            TEXT NOT NULL,
  rule_id               BIGINT REFERENCES dss.csp_rules (id)     ON DELETE CASCADE NOT NULL UNIQUE,
  id_on_profiler        BIGINT,
  cluster_id            BIGINT                                  NOT NULL,
  status                VARCHAR(255),
  start_time            BIGINT NOT NULL,
  lastupdated_time      BIGINT NOT NULL,
  response_data         TEXT
);