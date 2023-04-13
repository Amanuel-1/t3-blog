import PostCard from "@components/PostCard";
import { trpc } from "@utils/trpc";
import { useRouter } from "next/router";
import { FilterTypes } from "@hooks/useFilterPosts";
import { useEffect, useMemo, useRef } from "react";
import Comment from "./Comment";
import EmptyMessage from "./EmptyMessage";
import ShouldRender from "./ShouldRender";
import useOnScreen from "@hooks/useOnScreen";

type Props = {
  currentTab: "posts" | "comments";
  currentFilter: FilterTypes;
};

const UserPageList: React.FC<Props> = ({ currentTab, currentFilter }) => {
  const isPostsTab = currentTab === "posts";
  const isCommentsTab = currentTab === "comments";

  const router = useRouter();
  const userId = router.query.userId as string;

  const bottomRef = useRef<HTMLDivElement>(null);
  const reachedBottom = useOnScreen(bottomRef);

  const loadingArray = Array.from<undefined>({ length: 4 });

  const {
    data: userComments,
    isLoading: loadingComments,
    isFetchingNextPage: fetchingMoreComments,
    hasNextPage: hasMoreComments,
    fetchNextPage: fetchMoreComments,
  } = trpc.useInfiniteQuery(
    [
      "comments.user-comments",
      {
        userId,
        limit: 4,
        filter: currentFilter,
      },
    ],
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      ssr: false,
      enabled: isCommentsTab,
    }
  );

  const commentsToShow = useMemo(
    () => userComments?.pages.flatMap((page) => page.comments),
    [userComments]
  );

  const noCommentsToShow =
    !loadingComments && !commentsToShow?.length && !hasMoreComments;

  const {
    data,
    isLoading: loadingPosts,
    fetchNextPage: fetchMorePosts,
    isFetchingNextPage: isFetchingMorePosts,
    hasNextPage: hasMorePosts,
  } = trpc.useInfiniteQuery(
    [
      "posts.posts",
      {
        userId,
        limit: 4,
        filter: currentFilter,
      },
    ],
    {
      enabled: isPostsTab,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // The initial focus of this page is the user, so the
      // user's comments can load afterwards.
      ssr: false,
    }
  );

  const dataToShow = useMemo(
    () => data?.pages.flatMap((page) => page.posts),
    [data]
  );

  const noPostsToShow = !loadingPosts && !dataToShow?.length && !hasMorePosts;

  useEffect(() => {
    if (reachedBottom && hasMorePosts && isPostsTab) {
      fetchMorePosts();
    }

    if (reachedBottom && hasMoreComments && isCommentsTab) {
      fetchMoreComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reachedBottom]);

  return (
    <div className="flex w-full flex-col gap-10">
      <ShouldRender if={isPostsTab}>
        {(loadingPosts ? loadingArray : dataToShow)?.map((post, i) => (
          <PostCard
            post={post}
            key={loadingPosts ? i : post?.id}
            loading={loadingPosts}
          />
        ))}

        <ShouldRender if={isFetchingMorePosts}>
          <PostCard loading />
        </ShouldRender>

        <ShouldRender if={noPostsToShow}>
          <EmptyMessage message="Hmm. It seems that this user has not created any posts yet." />
        </ShouldRender>
      </ShouldRender>

      <ShouldRender if={isCommentsTab}>
        {(loadingComments ? loadingArray : commentsToShow)?.map(
          (comment, i) => (
            <Comment
              comment={comment}
              key={loadingComments ? i : comment?.id}
              loading={loadingComments}
              hideReplies
              variant="outlined"
              linkToPost
            />
          )
        )}

        <ShouldRender if={fetchingMoreComments}>
          <Comment loading linkToPost variant="outlined" />
        </ShouldRender>

        <ShouldRender if={noCommentsToShow}>
          <EmptyMessage message="Hmm. It seems that this user has not commented on any posts yet." />
        </ShouldRender>
      </ShouldRender>

      <div ref={bottomRef} />
    </div>
  );
};

export default UserPageList;
