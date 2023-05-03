/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.cloudorc.solidui.dao.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cloudorc.solidui.dao.entity.User;
import org.apache.ibatis.annotations.Param;
import org.springframework.cache.annotation.CacheConfig;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;


@CacheConfig(cacheNames = "user", keyGenerator = "cacheKeyGenerator")
public interface UserMapper extends BaseMapper<User> {

    /**
     * select by user id
     */
    @Cacheable(sync = true)
    User selectById(int id);

    /**
     * delete by id
     */
    @CacheEvict
    int deleteById(int id);


    /**
     * query user by userName and password
     *
     * @param userName userName
     * @param password password
     * @return user
     */
    User queryUserByNamePassword(@Param("userName") String userName, @Param("password") String password);
}