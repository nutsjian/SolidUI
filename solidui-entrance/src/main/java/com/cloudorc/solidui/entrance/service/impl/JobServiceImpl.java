package com.cloudorc.solidui.entrance.service.impl;

import com.cloudorc.solidui.common.utils.JSONUtils;
import com.cloudorc.solidui.common.utils.Utils;
import com.cloudorc.solidui.dao.entity.JobElement;
import com.cloudorc.solidui.dao.entity.JobElementPage;
import com.cloudorc.solidui.dao.mapper.JobElementMapper;
import com.cloudorc.solidui.dao.mapper.JobElementPageMapper;
import com.cloudorc.solidui.entrance.dto.JobElementDTO;
import com.cloudorc.solidui.entrance.enums.Status;
import com.cloudorc.solidui.entrance.service.JobService;
import com.cloudorc.solidui.entrance.utils.Result;
import com.cloudorc.solidui.entrance.vo.JobElementPageVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
public class JobServiceImpl extends BaseServiceImpl implements JobService {
    @Autowired
    private JobElementPageMapper jobElementPageMapper;
    @Autowired
    private JobElementMapper jobElementMapper;

    private final static long CLEAN_PERIOD = 3 * 60 * 1000;

//    @PostConstruct
//    public void init() {
//        Utils.defaultScheduler().scheduleWithFixedDelay()
//    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Result createJob(JobElementPageVO jobElementPageVO) {
        Result result = new Result();


        Long projectId = jobElementPageVO.getProjectId();
        //check project exists
        if(projectId == null){
            putMsg(result, Status.CREATE_JOB_ERROR);
            return result;
        }

        JobElementPageVO.Page page = jobElementPageVO.getPage();
        if(page == null){
            putMsg(result, Status.CREATE_JOB_ERROR);
            return result;
        }
        JobElementPageVO.Size size = jobElementPageVO.getSize();
        if(size == null){
            putMsg(result, Status.CREATE_JOB_ERROR);
            return result;
        }

        List<JobElementPageVO.View> views = jobElementPageVO.getViews();
        if(views == null || views.size() == 0){
            putMsg(result, Status.CREATE_JOB_ERROR);
            return result;
        }

        //views for JobElementDTO
        for(JobElementPageVO.View view : views){

            JobElement jobElement = new JobElement();
            jobElement.setProjectId(projectId);
            jobElement.setDataType(view.getType());
            jobElement.setName(view.getTitle());
            jobElement.setCreateTime(new Date());
            jobElement.setUpdateTime(new Date());
            JobElementDTO.DataView dataView = deepCopyViewToDataView(view);
            String data = JSONUtils.toJsonString(dataView);
            jobElement.setData(data);
            if(jobElementMapper.insert(jobElement)>0){

                JobElementPage jobElementPage = new JobElementPage();
                jobElementPage.setJobPageId(page.getId());
                jobElementPage.setJobElementId(jobElement.getId());
                jobElementPage.setCreateTime(new Date());
                jobElementPage.setUpdateTime(new Date());
                jobElementPage.setPosition(JSONUtils.toJsonString(size));
                if(jobElementPageMapper.insert(jobElementPage) <= 0){
                    putMsg(result, Status.CREATE_JOB_ERROR);
                    return result;
                }

            }else{
                putMsg(result, Status.CREATE_JOB_ERROR);
                return result;
            }
        }
        return Result.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Result updateJob(JobElementPageVO jobElementPageVO) {
        Result result = new Result();

        // Validate jobElementPageVO data
        if (jobElementPageVO == null) {
            putMsg(result, Status.UPDATE_JOB_ERROR);
            return result;
        }
        // Omitting the validation of project ID and other properties, as you have already done this in the createJob method
        List<JobElementPageVO.View> views = jobElementPageVO.getViews();
        if (views == null || views.isEmpty()) {
            putMsg(result, Status.UPDATE_JOB_ERROR);
            return result;
        }

        // Iterate through views and update JobElement and JobElementPage
        for (JobElementPageVO.View view : views) {
            // Retrieve JobElement
            JobElement jobElement = jobElementMapper.selectById(view.getId());
            if (jobElement == null) {
                putMsg(result, Status.UPDATE_JOB_ERROR);
                return result;
            }

            // Update JobElement data
            jobElement.setDataType(view.getType());
            jobElement.setName(view.getTitle());
            jobElement.setUpdateTime(new Date());
            JobElementDTO.DataView dataView = deepCopyViewToDataView(view);
            String data = JSONUtils.toJsonString(dataView);
            jobElement.setData(data);

            // Update JobElement record
            if (jobElementMapper.updateById(jobElement) <= 0) {
                putMsg(result, Status.UPDATE_JOB_ERROR);
                return result;
            }

            // Retrieve JobElementPage associated with JobElement
            JobElementPage jobElementPage = jobElementPageMapper.selectByJobElementId(jobElement.getId());
            if (jobElementPage == null) {
                putMsg(result, Status.UPDATE_JOB_ERROR);
                return result;
            }

            // Update JobElementPage data
            jobElementPage.setUpdateTime(new Date());
            jobElementPage.setPosition(JSONUtils.toJsonString(jobElementPageVO.getSize()));

            // Update JobElementPage record
            if (jobElementPageMapper.updateById(jobElementPage) <= 0) {
                putMsg(result, Status.UPDATE_JOB_ERROR);
                return result;
            }
        }

        return Result.success();
    }

    @Override
    public Result queryJobsByProjectId(Long projectId, Long pageId) {
        Result result = new Result();

        // Validate input parameters
        if (projectId == null || pageId == null) {
            putMsg(result, Status.QUERY_JOB_ERROR);
            return result;
        }

        // Retrieve the list of JobElementPage associated with the projectId and pageId
        List<JobElementPage> jobElementPages = jobElementPageMapper.selectByProjectIdAndPageId(projectId, pageId);
        if (jobElementPages == null || jobElementPages.isEmpty()) {
            putMsg(result, Status.QUERY_JOB_ERROR);
            return result;
        }

        JobElementPageVO jobElementPageVOs = new JobElementPageVO();
        jobElementPageVOs.setProjectId(projectId);
        boolean first = true;
        List<JobElementPageVO.View> views = new ArrayList<>();
        for (JobElementPage jobElementPage : jobElementPages) {
            // Retrieve the associated JobElement
            JobElement jobElement = jobElementMapper.selectById(jobElementPage.getJobElementId());
            if (jobElement == null) {
                putMsg(result, Status.QUERY_JOB_ERROR);
                return result;
            }
            if(first){
                jobElementPageVOs.setPage(JobElementPageVO.Page.builder().id(jobElementPage.getJobPageId()).build());
                jobElementPageVOs.setSize(JSONUtils.parseObject(jobElementPage.getPosition(), JobElementPageVO.Size.class));
                first = false;
            }
            // Create JobElementPageVO from JobElement and JobElementPage
            createJobElementPageVO(jobElement,views);

        }
        jobElementPageVOs.setViews(views);
        result.setData(jobElementPageVOs);
        return Result.success();
    }


    private JobElementDTO.DataView deepCopyViewToDataView(JobElementPageVO.View view) {
        // copy Position
        JobElementPageVO.View.Position newPosition = null;
        if (view.getPosition() != null) {
            newPosition = new JobElementPageVO.View.Position();
            newPosition.setTop(view.getPosition().getTop());
            newPosition.setLeft(view.getPosition().getLeft());
        }

        // copy Size
        JobElementPageVO.Size newSize = null;
        if (view.getSize() != null) {
            newSize = new JobElementPageVO.Size();
            newSize.setWidth(view.getSize().getWidth());
            newSize.setHeight(view.getSize().getHeight());
        }

        // copy Data
        JobElementPageVO.View.Data newData = null;
        if (view.getData() != null) {
            newData = new JobElementPageVO.View.Data();
            newData.setDataSourceId(view.getData().getDataSourceId());
            newData.setDataSourceTypeId(view.getData().getDataSourceTypeId());
            newData.setSql(view.getData().getSql());
        }

        // copy DataView
        JobElementDTO.DataView dataView = new JobElementDTO.DataView();
        dataView.setPosition(newPosition);
        dataView.setSize(newSize);
        dataView.setOptions(view.getOptions());
        dataView.setData(newData);

        return dataView;
    }

    private void createJobElementPageVO(JobElement jobElement, List<JobElementPageVO.View> views) {
        if (jobElement == null) {
            return;
        }

        JobElementPageVO.View view = new JobElementPageVO.View();
        view.setId(jobElement.getId());
        view.setTitle(jobElement.getName());
        view.setType(jobElement.getDataType());
        JobElementDTO.DataView dataView = JSONUtils.parseObject(jobElement.getData(), JobElementDTO.DataView.class);
        if(dataView == null){
            return;
        }
        view.setPosition(dataView.getPosition());
        view.setSize(dataView.getSize());
        view.setOptions(dataView.getOptions());
        view.setData(dataView.getData());
        views.add(view);
    }
}
