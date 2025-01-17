{-|
Module: IHP.FileStorage.Config
Description: Helpers for Config.hs to set up the File Storage
Copyright: (c) digitally induced GmbH, 2021
-}
module IHP.FileStorage.Config
( initS3Storage
, initStaticDirStorage
, initMinioStorage
) where

import IHP.Prelude
import IHP.FileStorage.Types
import IHP.FrameworkConfig

import Network.Minio

import qualified Control.Monad.Trans.State.Strict as State
import qualified Data.TMap as TMap

-- | The AWS access key and secret key have to be provided using the @AWS_ACCESS_KEY_ID@ and @AWS_SECRET_ACCESS_KEY@ env vars.
--
-- __Example:__ Set up a s3 storage in @Config.hs@
--
-- > module Config where
-- > 
-- > import IHP.Prelude
-- > import IHP.Environment
-- > import IHP.FrameworkConfig
-- > import IHP.FileStorage.Config
-- > 
-- > config :: ConfigBuilder
-- > config = do
-- >     option Development
-- >     option (AppHostname "localhost")
-- >     initS3Storage "eu-central-1" "my-bucket-name"
--
initS3Storage :: Text -> Text -> State.StateT TMap.TMap IO ()
initS3Storage region bucket = do
    connectInfo <- awsCI
        |> setRegion region
        |> setCredsFrom [fromAWSEnv]
        |> liftIO

    let baseUrl = "https://" <> bucket <> ".s3." <> region <> ".amazonaws.com/"
    option S3Storage { connectInfo, bucket, baseUrl }

-- | The Minio access key and secret key have to be provided using the @MINIO_ACCESS_KEY@ and @MINIO_SECRET_KEY@ env vars.
--
-- __Example:__ Set up a minio storage in @Config.hs@
--
-- > module Config where
-- >
-- > import IHP.Prelude
-- > import IHP.Environment
-- > import IHP.FrameworkConfig
-- > import IHP.FileStorage.Config
-- >
-- > config :: ConfigBuilder
-- > config = do
-- >     option Development
-- >     option (AppHostname "localhost")
-- >     initMinioStorage "https://minio.example.com" "my-bucket-name"
--
initMinioStorage :: Text -> Text -> State.StateT TMap.TMap IO ()
initMinioStorage server bucket = do
    connectInfo <- server
        |> cs
        |> fromString
        |> setCredsFrom [fromMinioEnv]
        |> liftIO

    let baseUrl = server <> "/" <> bucket <> "/"
    option S3Storage { connectInfo, bucket, baseUrl }

-- | Stores files publicly visible inside the @static@ directory
--
-- __Example:__ Store uploaded files in the @static/@ directory
--
-- > module Config where
-- > 
-- > import IHP.Prelude
-- > import IHP.Environment
-- > import IHP.FrameworkConfig
-- > import IHP.FileStorage.Config
-- > 
-- > config :: ConfigBuilder
-- > config = do
-- >     option Development
-- >     option (AppHostname "localhost")
-- >     initStaticDirStorage
--
initStaticDirStorage :: State.StateT TMap.TMap IO ()
initStaticDirStorage = option StaticDirStorage